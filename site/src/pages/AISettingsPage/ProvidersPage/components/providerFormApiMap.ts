import type {
	AIProvider,
	AIProviderSettings,
	CreateAIProviderRequest,
	UpdateAIProviderRequest,
} from "#/api/typesGenerated";
import type { ProviderFormValues } from "./ProviderForm";

/**
 * The wire API only knows about `openai` and `anthropic`; AWS Bedrock is a
 * Bedrock-specific configuration of an Anthropic provider, recognized by the
 * presence of `bedrock_*` fields on Settings.
 */
const isBedrockProvider = (provider: AIProvider): boolean => {
	if (provider.type !== "anthropic") {
		return false;
	}
	const s = provider.settings;
	return Boolean(
		s.bedrock_region || s.bedrock_model || s.bedrock_small_fast_model,
	);
};

/** Bedrock has stored credentials on the server. */
export const hasBedrockStoredCredentials = (provider: AIProvider): boolean => {
	if (!isBedrockProvider(provider)) {
		return false;
	}
	// Bedrock secret fields are write-only and never present in responses, so
	// we can't observe the values directly. The server only persists Bedrock
	// settings if credentials were supplied, so the presence of a Bedrock
	// configuration implies credentials are on file.
	return true;
};

/**
 * Input to the create mutation. `apiKey` is only used for openai/anthropic
 * providers; Bedrock providers carry their AWS credentials in
 * `request.settings`. The caller is responsible for chaining
 * `POST /providers/{id}/keys` after the provider is created.
 */
type ProviderCreatePayload = {
	request: CreateAIProviderRequest;
	apiKey?: string;
};

/**
 * Build a create request from form values. For Bedrock the API key field is
 * ignored; AWS credentials go into `settings`. For openai/anthropic the
 * caller pulls `apiKey` off the result and POSTs it to the keys sub-resource.
 */
export const providerFormValuesToCreate = (
	values: ProviderFormValues,
): ProviderCreatePayload => {
	const name = values.name.trim();
	const baseUrl = values.baseUrl.trim();
	const displayName = name;

	if (values.type === "bedrock") {
		const settings: AIProviderSettings = {
			bedrock_model: values.model.trim(),
			bedrock_small_fast_model: values.smallFastModel.trim(),
			bedrock_access_key: values.accessKey.trim(),
			bedrock_access_key_secret: values.accessKeySecret.trim(),
		};
		return {
			request: {
				type: "anthropic",
				name,
				display_name: displayName,
				base_url: baseUrl,
				enabled: values.enabled,
				settings,
			},
		};
	}

	return {
		request: {
			type: values.type === "openai" ? "openai" : "anthropic",
			name,
			display_name: displayName,
			base_url: baseUrl,
			enabled: values.enabled,
		},
		apiKey: values.apiKey.trim() || undefined,
	};
};

/**
 * Build a PATCH payload for an existing provider. Bedrock secrets follow an
 * "empty = keep" contract: if the user did not clear the masked inputs, we
 * send no Bedrock secret fields and the server leaves them unchanged. The
 * non-secret Bedrock settings (region, models) are always sent when the form
 * holds a Bedrock provider.
 */
export const providerFormValuesToUpdate = (
	values: ProviderFormValues,
	existingProvider: AIProvider,
): UpdateAIProviderRequest => {
	const base: UpdateAIProviderRequest = {
		display_name: values.name.trim(),
		enabled: values.enabled,
		base_url: values.baseUrl.trim(),
	};

	if (values.type !== "bedrock") {
		return base;
	}

	const newAccessKey = values.accessKey.trim();
	const newAccessKeySecret = values.accessKeySecret.trim();
	const credentialsChanged = newAccessKey !== "" && newAccessKeySecret !== "";

	const settings: AIProviderSettings = {
		bedrock_model: values.model.trim(),
		bedrock_small_fast_model: values.smallFastModel.trim(),
		// Preserve the saved region; the form doesn't surface region today.
		...(existingProvider.settings.bedrock_region
			? { bedrock_region: existingProvider.settings.bedrock_region }
			: {}),
		...(credentialsChanged
			? {
					bedrock_access_key: newAccessKey,
					bedrock_access_key_secret: newAccessKeySecret,
				}
			: {}),
	};

	return { ...base, settings };
};

/** Populate the form from an `AIProvider` fetched from the API. */
export const aiProviderToFormValues = (
	provider: AIProvider,
): Partial<ProviderFormValues> => {
	if (isBedrockProvider(provider)) {
		const s = provider.settings;
		return {
			type: "bedrock",
			name: provider.name,
			baseUrl: provider.base_url,
			model: s.bedrock_model ?? "",
			smallFastModel: s.bedrock_small_fast_model ?? "",
			accessKey: "",
			accessKeySecret: "",
			enabled: provider.enabled,
		};
	}

	return {
		type: provider.type === "openai" ? "openai" : "anthropic",
		name: provider.name,
		baseUrl: provider.base_url,
		apiKey: "",
		enabled: provider.enabled,
	};
};
