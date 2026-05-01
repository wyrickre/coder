package coderd

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/xerrors"

	"github.com/coder/coder/v2/coderd/audit"
	"github.com/coder/coder/v2/coderd/database"
	"github.com/coder/coder/v2/coderd/database/dbauthz"
	"github.com/coder/coder/v2/coderd/database/dbtime"
	"github.com/coder/coder/v2/coderd/httpapi"
	"github.com/coder/coder/v2/codersdk"
)

// aiProviderNameRegex mirrors the CHECK constraint on ai_providers.name.
// Provider names are lowercase alphanumeric with hyphen separators so they
// are safe in URLs.
var aiProviderNameRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// reservedAIProviderNames are paths under /api/v2/aibridge that must not
// collide with provider names. The aibridged catch-all route uses provider
// name as the first path segment, so any name that overlaps with a fixed
// route would shadow it.
var reservedAIProviderNames = map[string]struct{}{
	"proxy":         {},
	"interceptions": {},
	"sessions":      {},
	"models":        {},
	"clients":       {},
}

// aiProviderSettingsBlob is the on-disk JSON shape of ai_providers.settings.
// It is encrypted as a single blob via dbcrypt; this struct is what we
// marshal/unmarshal on either side of that boundary. For Bedrock providers
// the AWS access key and secret live here because the parent provider row
// no longer carries an api_key column.
type aiProviderSettingsBlob struct {
	BedrockRegion          string `json:"bedrock_region,omitempty"`
	BedrockModel           string `json:"bedrock_model,omitempty"`
	BedrockSmallFastModel  string `json:"bedrock_small_fast_model,omitempty"`
	BedrockAccessKey       string `json:"bedrock_access_key,omitempty"`
	BedrockAccessKeySecret string `json:"bedrock_access_key_secret,omitempty"`
}

// aiBridgeProvidersHandler registers the CRUD HTTP routes for the
// runtime AI Bridge provider configuration at /api/v2/ai/providers,
// including the keys sub-resource at /api/v2/ai/providers/{idOrName}/keys.
func aiBridgeProvidersHandler(api *API, middlewares ...func(http.Handler) http.Handler) func(r chi.Router) {
	return func(r chi.Router) {
		r.Use(middlewares...)
		r.Get("/", api.aiBridgeListProviders)
		r.Post("/", api.aiBridgeCreateProvider)
		r.Route("/{idOrName}", func(r chi.Router) {
			r.Get("/", api.aiBridgeGetProvider)
			r.Patch("/", api.aiBridgeUpdateProvider)
			r.Delete("/", api.aiBridgeDeleteProvider)
			r.Route("/keys", func(r chi.Router) {
				r.Get("/", api.aiBridgeListProviderKeys)
				r.Post("/", api.aiBridgeCreateProviderKey)
				r.Delete("/{keyID}", api.aiBridgeDeleteProviderKey)
			})
		})
	}
}

// @Summary List AI Bridge providers
// @ID list-ai-bridge-providers
// @Security CoderSessionToken
// @Produce json
// @Tags AI Bridge
// @Success 200 {array} codersdk.AIProvider
// @Router /api/v2/ai/providers [get]
func (api *API) aiBridgeListProviders(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rows, err := api.Database.GetAIProviders(ctx, database.GetAIProvidersParams{
		IncludeDisabled: true,
	})
	if dbauthz.IsNotAuthorizedError(err) {
		httpapi.Forbidden(rw)
		return
	}
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error listing AI providers.",
			Detail:  err.Error(),
		})
		return
	}

	out := make([]codersdk.AIProvider, 0, len(rows))
	for _, row := range rows {
		sdk, err := dbAIProviderToSDK(row)
		if err != nil {
			httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
				Message: "Internal error converting AI provider.",
				Detail:  err.Error(),
			})
			return
		}
		out = append(out, sdk)
	}
	httpapi.Write(ctx, rw, http.StatusOK, out)
}

// @Summary Get an AI Bridge provider
// @ID get-an-ai-bridge-provider
// @Security CoderSessionToken
// @Produce json
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Success 200 {object} codersdk.AIProvider
// @Router /api/v2/ai/providers/{idOrName} [get]
func (api *API) aiBridgeGetProvider(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	row, err := lookupAIProvider(ctx, api.Database, chi.URLParam(r, "idOrName"))
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}

	sdk, err := dbAIProviderToSDK(row)
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error converting AI provider.",
			Detail:  err.Error(),
		})
		return
	}
	httpapi.Write(ctx, rw, http.StatusOK, sdk)
}

// @Summary Create an AI Bridge provider
// @ID create-an-ai-bridge-provider
// @Security CoderSessionToken
// @Accept json
// @Produce json
// @Tags AI Bridge
// @Param request body codersdk.CreateAIProviderRequest true "Create AI provider request"
// @Success 201 {object} codersdk.AIProvider
// @Router /api/v2/ai/providers [post]
func (api *API) aiBridgeCreateProvider(rw http.ResponseWriter, r *http.Request) {
	var (
		ctx               = r.Context()
		auditor           = api.AGPL.Auditor.Load()
		aReq, commitAudit = audit.InitRequest[database.AIProvider](rw, &audit.RequestParams{
			Audit:   *auditor,
			Log:     api.AGPL.Logger,
			Request: r,
			Action:  database.AuditActionCreate,
		})
	)
	defer commitAudit()

	var req codersdk.CreateAIProviderRequest
	if !httpapi.Read(ctx, rw, r, &req) {
		return
	}

	if validations := validateCreateAIProviderRequest(req); len(validations) > 0 {
		httpapi.Write(ctx, rw, http.StatusBadRequest, codersdk.Response{
			Message:     "Invalid AI provider request.",
			Validations: validations,
		})
		return
	}

	settings, err := encodeSettingsFromSDK(req.Settings)
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error encoding settings.",
			Detail:  err.Error(),
		})
		return
	}

	row, err := api.Database.InsertAIProvider(ctx, database.InsertAIProviderParams{
		ID:          uuid.New(),
		Type:        database.AIProviderType(req.Type),
		Name:        req.Name,
		DisplayName: sql.NullString{String: req.DisplayName, Valid: req.DisplayName != ""},
		Enabled:     req.Enabled,
		BaseUrl:     req.BaseURL,
		Settings:    settings,
		// SettingsKeyID is set by the dbcrypt wrapper.
		SettingsKeyID: sql.NullString{},
	})
	if err != nil {
		if database.IsUniqueViolation(err) {
			httpapi.Write(ctx, rw, http.StatusConflict, codersdk.Response{
				Message: fmt.Sprintf("AI provider %q already exists.", req.Name),
				Detail:  err.Error(),
			})
			return
		}
		if dbauthz.IsNotAuthorizedError(err) {
			httpapi.Forbidden(rw)
			return
		}
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error creating AI provider.",
			Detail:  err.Error(),
		})
		return
	}
	aReq.New = row

	sdk, err := dbAIProviderToSDK(row)
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error converting AI provider.",
			Detail:  err.Error(),
		})
		return
	}
	httpapi.Write(ctx, rw, http.StatusCreated, sdk)
}

// @Summary Update an AI Bridge provider
// @ID update-an-ai-bridge-provider
// @Security CoderSessionToken
// @Accept json
// @Produce json
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Param request body codersdk.UpdateAIProviderRequest true "Update AI provider request"
// @Success 200 {object} codersdk.AIProvider
// @Router /api/v2/ai/providers/{idOrName} [patch]
func (api *API) aiBridgeUpdateProvider(rw http.ResponseWriter, r *http.Request) {
	var (
		ctx               = r.Context()
		auditor           = api.AGPL.Auditor.Load()
		aReq, commitAudit = audit.InitRequest[database.AIProvider](rw, &audit.RequestParams{
			Audit:   *auditor,
			Log:     api.AGPL.Logger,
			Request: r,
			Action:  database.AuditActionWrite,
		})
	)
	defer commitAudit()

	var req codersdk.UpdateAIProviderRequest
	if !httpapi.Read(ctx, rw, r, &req) {
		return
	}

	if req.DisplayName == nil && req.Enabled == nil && req.BaseURL == nil && req.Settings == nil {
		httpapi.Write(ctx, rw, http.StatusBadRequest, codersdk.Response{
			Message: "At least one field must be provided.",
		})
		return
	}
	if validations := validateUpdateAIProviderRequest(req); len(validations) > 0 {
		httpapi.Write(ctx, rw, http.StatusBadRequest, codersdk.Response{
			Message:     "Invalid AI provider request.",
			Validations: validations,
		})
		return
	}

	idOrName := chi.URLParam(r, "idOrName")

	var updated database.AIProvider
	err := api.Database.InTx(func(tx database.Store) error {
		old, err := lookupAIProvider(ctx, tx, idOrName)
		if err != nil {
			return err
		}
		aReq.Old = old

		// Decode the existing settings to merge with the patch. The dbcrypt
		// wrapper has already decrypted the blob for us.
		var blob aiProviderSettingsBlob
		if old.Settings.Valid && old.Settings.String != "" {
			if err := json.Unmarshal([]byte(old.Settings.String), &blob); err != nil {
				return xerrors.Errorf("decode existing settings: %w", err)
			}
		}
		if req.Settings != nil {
			blob.BedrockRegion = req.Settings.BedrockRegion
			blob.BedrockModel = req.Settings.BedrockModel
			blob.BedrockSmallFastModel = req.Settings.BedrockSmallFastModel
			// Bedrock secrets are write-only: only overwrite when the
			// caller actually supplied a non-empty value, so callers can
			// rotate non-secret fields without resending the secret.
			if req.Settings.BedrockAccessKey != "" {
				blob.BedrockAccessKey = req.Settings.BedrockAccessKey
			}
			if req.Settings.BedrockAccessKeySecret != "" {
				blob.BedrockAccessKeySecret = req.Settings.BedrockAccessKeySecret
			}
		}
		settings, err := encodeSettingsBlob(blob)
		if err != nil {
			return xerrors.Errorf("encode settings: %w", err)
		}

		params := database.UpdateAIProviderParams{
			ID:            old.ID,
			DisplayName:   nullStrDeref(req.DisplayName, old.DisplayName),
			Enabled:       boolDeref(req.Enabled, old.Enabled),
			BaseUrl:       strDeref(req.BaseURL, old.BaseUrl),
			Settings:      settings,
			SettingsKeyID: sql.NullString{},
		}

		updated, err = tx.UpdateAIProvider(ctx, params)
		if err != nil {
			return xerrors.Errorf("update ai provider: %w", err)
		}
		aReq.New = updated
		return nil
	}, nil)
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}

	sdk, err := dbAIProviderToSDK(updated)
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error converting AI provider.",
			Detail:  err.Error(),
		})
		return
	}
	httpapi.Write(ctx, rw, http.StatusOK, sdk)
}

// @Summary Delete an AI Bridge provider
// @ID delete-an-ai-bridge-provider
// @Security CoderSessionToken
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Success 204
// @Router /api/v2/ai/providers/{idOrName} [delete]
func (api *API) aiBridgeDeleteProvider(rw http.ResponseWriter, r *http.Request) {
	var (
		ctx               = r.Context()
		auditor           = api.AGPL.Auditor.Load()
		aReq, commitAudit = audit.InitRequest[database.AIProvider](rw, &audit.RequestParams{
			Audit:   *auditor,
			Log:     api.AGPL.Logger,
			Request: r,
			Action:  database.AuditActionDelete,
		})
	)
	defer commitAudit()

	idOrName := chi.URLParam(r, "idOrName")

	row, err := lookupAIProvider(ctx, api.Database, idOrName)
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}
	aReq.Old = row

	if err := api.Database.DeleteAIProviderByID(ctx, row.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Already gone; treat as success for idempotency.
			rw.WriteHeader(http.StatusNoContent)
			return
		}
		if dbauthz.IsNotAuthorizedError(err) {
			httpapi.Forbidden(rw)
			return
		}
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error deleting AI provider.",
			Detail:  err.Error(),
		})
		return
	}

	rw.WriteHeader(http.StatusNoContent)
}

// @Summary List AI Bridge provider keys
// @ID list-ai-bridge-provider-keys
// @Security CoderSessionToken
// @Produce json
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Success 200 {array} codersdk.AIProviderKey
// @Router /api/v2/ai/providers/{idOrName}/keys [get]
func (api *API) aiBridgeListProviderKeys(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	provider, err := lookupAIProvider(ctx, api.Database, chi.URLParam(r, "idOrName"))
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}

	rows, err := api.Database.GetAIProviderKeysByProviderID(ctx, provider.ID)
	if dbauthz.IsNotAuthorizedError(err) {
		httpapi.Forbidden(rw)
		return
	}
	if err != nil {
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error listing AI provider keys.",
			Detail:  err.Error(),
		})
		return
	}

	out := make([]codersdk.AIProviderKey, 0, len(rows))
	for _, row := range rows {
		out = append(out, dbAIProviderKeyToSDK(row))
	}
	httpapi.Write(ctx, rw, http.StatusOK, out)
}

// @Summary Create an AI Bridge provider key
// @ID create-an-ai-bridge-provider-key
// @Security CoderSessionToken
// @Accept json
// @Produce json
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Param request body codersdk.CreateAIProviderKeyRequest true "Create AI provider key request"
// @Success 201 {object} codersdk.AIProviderKey
// @Router /api/v2/ai/providers/{idOrName}/keys [post]
func (api *API) aiBridgeCreateProviderKey(rw http.ResponseWriter, r *http.Request) {
	var (
		ctx               = r.Context()
		auditor           = api.AGPL.Auditor.Load()
		aReq, commitAudit = audit.InitRequest[database.AIProviderKey](rw, &audit.RequestParams{
			Audit:   *auditor,
			Log:     api.AGPL.Logger,
			Request: r,
			Action:  database.AuditActionCreate,
		})
	)
	defer commitAudit()

	provider, err := lookupAIProvider(ctx, api.Database, chi.URLParam(r, "idOrName"))
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}

	var req codersdk.CreateAIProviderKeyRequest
	if !httpapi.Read(ctx, rw, r, &req) {
		return
	}

	if strings.TrimSpace(req.APIKey) == "" {
		httpapi.Write(ctx, rw, http.StatusBadRequest, codersdk.Response{
			Message: "Invalid AI provider key request.",
			Validations: []codersdk.ValidationError{
				{Field: "api_key", Detail: "api_key is required"},
			},
		})
		return
	}

	// Bedrock providers authenticate via the settings blob, not via a
	// bearer key, so registering a key would be silently unused.
	if isBedrockProvider(provider) {
		httpapi.Write(ctx, rw, http.StatusBadRequest, codersdk.Response{
			Message: "Bedrock providers do not accept API keys; configure access credentials via the provider settings.",
		})
		return
	}

	now := dbtime.Now()
	row, err := api.Database.InsertAIProviderKey(ctx, database.InsertAIProviderKeyParams{
		ID:          uuid.New(),
		ProviderID:  provider.ID,
		APIKey:      req.APIKey,
		ApiKeyKeyID: sql.NullString{},
		CreatedAt:   now,
		UpdatedAt:   now,
	})
	if err != nil {
		if dbauthz.IsNotAuthorizedError(err) {
			httpapi.Forbidden(rw)
			return
		}
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error creating AI provider key.",
			Detail:  err.Error(),
		})
		return
	}
	aReq.New = row

	httpapi.Write(ctx, rw, http.StatusCreated, dbAIProviderKeyToSDK(row))
}

// @Summary Delete an AI Bridge provider key
// @ID delete-an-ai-bridge-provider-key
// @Security CoderSessionToken
// @Tags AI Bridge
// @Param idOrName path string true "Provider ID or name"
// @Param keyID path string true "Key ID" format(uuid)
// @Success 204
// @Router /api/v2/ai/providers/{idOrName}/keys/{keyID} [delete]
func (api *API) aiBridgeDeleteProviderKey(rw http.ResponseWriter, r *http.Request) {
	var (
		ctx               = r.Context()
		auditor           = api.AGPL.Auditor.Load()
		aReq, commitAudit = audit.InitRequest[database.AIProviderKey](rw, &audit.RequestParams{
			Audit:   *auditor,
			Log:     api.AGPL.Logger,
			Request: r,
			Action:  database.AuditActionDelete,
		})
	)
	defer commitAudit()

	provider, err := lookupAIProvider(ctx, api.Database, chi.URLParam(r, "idOrName"))
	if err != nil {
		writeAIProviderLookupError(ctx, rw, err)
		return
	}

	keyID, err := uuid.Parse(chi.URLParam(r, "keyID"))
	if err != nil {
		httpapi.ResourceNotFound(rw)
		return
	}

	existing, err := api.Database.GetAIProviderKeyByID(ctx, keyID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httpapi.ResourceNotFound(rw)
			return
		}
		if dbauthz.IsNotAuthorizedError(err) {
			httpapi.Forbidden(rw)
			return
		}
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error fetching AI provider key.",
			Detail:  err.Error(),
		})
		return
	}
	if existing.ProviderID != provider.ID {
		// Don't leak the existence of a key under a different provider.
		httpapi.ResourceNotFound(rw)
		return
	}
	aReq.Old = existing

	if err := api.Database.DeleteAIProviderKey(ctx, keyID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			rw.WriteHeader(http.StatusNoContent)
			return
		}
		if dbauthz.IsNotAuthorizedError(err) {
			httpapi.Forbidden(rw)
			return
		}
		httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
			Message: "Internal error deleting AI provider key.",
			Detail:  err.Error(),
		})
		return
	}

	rw.WriteHeader(http.StatusNoContent)
}

// lookupAIProvider resolves a UUID-or-name path parameter against a Store.
// Soft-deleted providers are not returned; lookup by name searches active
// rows only so reserved names cannot mask a deleted row's identity.
func lookupAIProvider(ctx context.Context, store database.Store, idOrName string) (database.AIProvider, error) {
	if id, err := uuid.Parse(idOrName); err == nil {
		row, err := store.GetAIProviderByID(ctx, id)
		if err != nil {
			return database.AIProvider{}, err
		}
		return row, nil
	}
	if !aiProviderNameRegex.MatchString(idOrName) {
		// The regex check protects against accidental/malicious lookups
		// against rows that should be impossible to insert.
		return database.AIProvider{}, sql.ErrNoRows
	}
	return store.GetAIProviderByName(ctx, idOrName)
}

// writeAIProviderLookupError translates lookup errors into the right HTTP
// status code.
func writeAIProviderLookupError(ctx context.Context, rw http.ResponseWriter, err error) {
	if errors.Is(err, sql.ErrNoRows) {
		httpapi.ResourceNotFound(rw)
		return
	}
	if dbauthz.IsNotAuthorizedError(err) {
		httpapi.Forbidden(rw)
		return
	}
	httpapi.Write(ctx, rw, http.StatusInternalServerError, codersdk.Response{
		Message: "Internal error fetching AI provider.",
		Detail:  err.Error(),
	})
}

// isBedrockProvider returns true when the row's settings indicate the
// provider targets AWS Bedrock. We treat the presence of any Bedrock
// field on the decrypted settings blob as authoritative.
func isBedrockProvider(row database.AIProvider) bool {
	if !row.Settings.Valid || row.Settings.String == "" {
		return false
	}
	var blob aiProviderSettingsBlob
	if err := json.Unmarshal([]byte(row.Settings.String), &blob); err != nil {
		return false
	}
	return blob.BedrockRegion != "" ||
		blob.BedrockModel != "" ||
		blob.BedrockSmallFastModel != "" ||
		blob.BedrockAccessKey != "" ||
		blob.BedrockAccessKeySecret != ""
}

// validateCreateAIProviderRequest returns the field-level validation errors
// for a create request. An empty slice indicates the request is valid.
func validateCreateAIProviderRequest(req codersdk.CreateAIProviderRequest) []codersdk.ValidationError {
	var validations []codersdk.ValidationError
	switch req.Type {
	case codersdk.AIProviderTypeOpenAI, codersdk.AIProviderTypeAnthropic:
	case "":
		validations = append(validations, codersdk.ValidationError{Field: "type", Detail: "type is required"})
	default:
		validations = append(validations, codersdk.ValidationError{
			Field:  "type",
			Detail: fmt.Sprintf("unsupported provider type %q; expected one of: openai, anthropic", req.Type),
		})
	}
	if errs := validateAIProviderName(req.Name); len(errs) > 0 {
		validations = append(validations, errs...)
	}
	if req.BaseURL == "" {
		validations = append(validations, codersdk.ValidationError{Field: "base_url", Detail: "base_url is required"})
	} else if errs := validateAIProviderBaseURL(req.BaseURL); len(errs) > 0 {
		validations = append(validations, errs...)
	}
	return validations
}

// validateUpdateAIProviderRequest validates only the fields that were
// supplied in the request.
func validateUpdateAIProviderRequest(req codersdk.UpdateAIProviderRequest) []codersdk.ValidationError {
	var validations []codersdk.ValidationError
	if req.BaseURL != nil {
		if *req.BaseURL == "" {
			validations = append(validations, codersdk.ValidationError{Field: "base_url", Detail: "base_url cannot be empty"})
		} else if errs := validateAIProviderBaseURL(*req.BaseURL); len(errs) > 0 {
			validations = append(validations, errs...)
		}
	}
	return validations
}

func validateAIProviderName(name string) []codersdk.ValidationError {
	var validations []codersdk.ValidationError
	switch {
	case name == "":
		validations = append(validations, codersdk.ValidationError{Field: "name", Detail: "name is required"})
	case !aiProviderNameRegex.MatchString(name):
		validations = append(validations, codersdk.ValidationError{
			Field:  "name",
			Detail: "name must match ^[a-z0-9]+(-[a-z0-9]+)*$ (lowercase alphanumeric, hyphens between words)",
		})
	default:
		if _, ok := reservedAIProviderNames[strings.ToLower(name)]; ok {
			validations = append(validations, codersdk.ValidationError{
				Field:  "name",
				Detail: fmt.Sprintf("%q is a reserved provider name", name),
			})
		}
	}
	return validations
}

func validateAIProviderBaseURL(raw string) []codersdk.ValidationError {
	var validations []codersdk.ValidationError
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		validations = append(validations, codersdk.ValidationError{
			Field:  "base_url",
			Detail: "base_url must be an absolute URL (e.g. https://api.example.com/)",
		})
		return validations
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		validations = append(validations, codersdk.ValidationError{
			Field:  "base_url",
			Detail: fmt.Sprintf("base_url scheme must be http or https, got %q", parsed.Scheme),
		})
	}
	return validations
}

// dbAIProviderToSDK converts a database row into the codersdk type. The
// caller is responsible for ensuring the row has been decrypted (i.e.
// fetched through the dbcrypt-wrapped store).
func dbAIProviderToSDK(row database.AIProvider) (codersdk.AIProvider, error) {
	display := row.Name
	if row.DisplayName.Valid && row.DisplayName.String != "" {
		display = row.DisplayName.String
	}
	out := codersdk.AIProvider{
		ID:          row.ID,
		Type:        codersdk.AIProviderType(row.Type),
		Name:        row.Name,
		DisplayName: display,
		Enabled:     row.Enabled,
		BaseURL:     row.BaseUrl,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
	if row.Settings.Valid && row.Settings.String != "" {
		var blob aiProviderSettingsBlob
		if err := json.Unmarshal([]byte(row.Settings.String), &blob); err != nil {
			return codersdk.AIProvider{}, xerrors.Errorf("decode settings: %w", err)
		}
		out.Settings = codersdk.AIProviderSettings{
			BedrockRegion:         blob.BedrockRegion,
			BedrockModel:          blob.BedrockModel,
			BedrockSmallFastModel: blob.BedrockSmallFastModel,
			// BedrockAccessKey and BedrockAccessKeySecret are
			// intentionally omitted from responses.
		}
	}
	return out, nil
}

// dbAIProviderKeyToSDK converts an ai_provider_keys row into the codersdk
// shape. The plaintext api_key is intentionally not included.
func dbAIProviderKeyToSDK(row database.AIProviderKey) codersdk.AIProviderKey {
	return codersdk.AIProviderKey{
		ID:         row.ID,
		ProviderID: row.ProviderID,
		CreatedAt:  row.CreatedAt,
		UpdatedAt:  row.UpdatedAt,
	}
}

// encodeSettingsFromSDK serializes the SDK settings shape into the
// on-disk JSON blob shape. Returns an invalid sql.NullString when no
// fields are set so the row stores SQL NULL and skips dbcrypt encryption
// entirely.
func encodeSettingsFromSDK(s codersdk.AIProviderSettings) (sql.NullString, error) {
	blob := aiProviderSettingsBlob{
		BedrockRegion:          s.BedrockRegion,
		BedrockModel:           s.BedrockModel,
		BedrockSmallFastModel:  s.BedrockSmallFastModel,
		BedrockAccessKey:       s.BedrockAccessKey,
		BedrockAccessKeySecret: s.BedrockAccessKeySecret,
	}
	return encodeSettingsBlob(blob)
}

func encodeSettingsBlob(blob aiProviderSettingsBlob) (sql.NullString, error) {
	if blob == (aiProviderSettingsBlob{}) {
		return sql.NullString{}, nil
	}
	out, err := json.Marshal(blob)
	if err != nil {
		return sql.NullString{}, err
	}
	return sql.NullString{String: string(out), Valid: true}, nil
}

func strDeref(p *string, fallback string) string {
	if p == nil {
		return fallback
	}
	return *p
}

// nullStrDeref returns fallback unchanged when p is nil; otherwise it
// returns a sql.NullString built from *p, treating an empty string as
// SQL NULL so callers can clear the column by sending "".
func nullStrDeref(p *string, fallback sql.NullString) sql.NullString {
	if p == nil {
		return fallback
	}
	return sql.NullString{String: *p, Valid: *p != ""}
}

func boolDeref(p *bool, fallback bool) bool {
	if p == nil {
		return fallback
	}
	return *p
}
