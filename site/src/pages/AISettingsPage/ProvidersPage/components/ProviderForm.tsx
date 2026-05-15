import { useFormik } from "formik";
import { TrashIcon } from "lucide-react";
import { type FC, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import * as Yup from "yup";
import { ErrorAlert } from "#/components/Alert/ErrorAlert";
import { Button } from "#/components/Button/Button";
import { Form, FormFields } from "#/components/Form/Form";
import { FormField } from "#/components/FormField/FormField";
import { Label } from "#/components/Label/Label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/Select/Select";
import { Spinner } from "#/components/Spinner/Spinner";
import { Switch } from "#/components/Switch/Switch";
import { ProviderIcon } from "#/pages/AISettingsPage/ProvidersPage/components/ProviderIcon";
import { cn } from "#/utils/cn";
import { getFormHelpers } from "#/utils/formUtils";

export type ProviderFormValues = {
	type: "" | "openai" | "anthropic" | "bedrock";
	name: string;
	baseUrl: string;
	model: string;
	smallFastModel: string;
	accessKey: string;
	accessKeySecret: string;
	apiKey: string;
	enabled: boolean;
};

// Public AWS partition Bedrock Runtime API base URL, for example
// https://bedrock-runtime.us-east-2.amazonaws.com
const bedrockRuntimeBaseUrlRegex =
	/^https:\/\/bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com\/?$/i;

// Provider names must match the kebab-case pattern enforced by the API.
const providerNameRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const providerNameErrorMessage =
	"Name must be lowercase, hyphen-separated (e.g. 'my-anthropic').";

/**
 * Stable mask shown in credential inputs when a value already exists on the
 * server. Focusing the input clears it, so we never have to round-trip the
 * mask to the API.
 */
export const SAVED_CREDENTIAL_MASK = "********";

const defaultInitialValues: ProviderFormValues = {
	type: "anthropic",
	name: "",
	baseUrl: "",
	model: "",
	smallFastModel: "",
	accessKey: "",
	accessKeySecret: "",
	apiKey: "",
	enabled: true,
};

const makeOpenAiAnthropicSchema = (editing: boolean) =>
	Yup.object({
		type: Yup.string()
			.oneOf(["openai", "anthropic"] as const)
			.required(),
		name: Yup.string()
			.matches(providerNameRegex, providerNameErrorMessage)
			.required("Name is required"),
		baseUrl: Yup.string().url("Custom endpoint must be a valid URL"),
		apiKey: editing
			? Yup.string()
			: Yup.string().required("API key is required"),
		enabled: Yup.boolean(),
	});

// Treat the saved-credential mask as empty: a value matching the placeholder
// should never be treated as a real, user-supplied credential during
// validation.
const credentialFilled = (value: string | undefined): boolean => {
	if (!value) return false;
	const trimmed = value.trim();
	return trimmed !== "" && trimmed !== SAVED_CREDENTIAL_MASK;
};

const makeBedrockSchema = (editing: boolean) =>
	Yup.object({
		type: Yup.string()
			.oneOf(["bedrock"] as const)
			.required(),
		name: Yup.string()
			.matches(providerNameRegex, providerNameErrorMessage)
			.required("Name is required"),
		baseUrl: Yup.string()
			.url("Base URL must be a valid URL")
			.matches(
				bedrockRuntimeBaseUrlRegex,
				"Base URL must be a valid Bedrock Runtime API base URL",
			)
			.required("Base URL is required"),
		apiKey: Yup.string(),
		model: Yup.string().required("Model is required"),
		smallFastModel: Yup.string().required("Small fast model is required"),
		accessKey: (editing
			? Yup.string()
			: Yup.string().required("Access key is required")
		).test(
			"access-key-paired",
			"Enter both access key and secret to rotate credentials.",
			function (value) {
				const secret = (this.parent as { accessKeySecret?: string })
					.accessKeySecret;
				return !(credentialFilled(secret) && !credentialFilled(value));
			},
		),
		accessKeySecret: (editing
			? Yup.string()
			: Yup.string().required("Access key secret is required")
		).test(
			"access-key-secret-paired",
			"Enter both access key and secret to rotate credentials.",
			function (value) {
				const accessKey = (this.parent as { accessKey?: string }).accessKey;
				return !(credentialFilled(accessKey) && !credentialFilled(value));
			},
		),
		enabled: Yup.boolean(),
	});

const getProviderFormSchema = (editing: boolean) =>
	Yup.lazy((value: { type?: string } | undefined) => {
		switch (value?.type) {
			case "openai":
			case "anthropic":
				return makeOpenAiAnthropicSchema(editing);
			case "bedrock":
				return makeBedrockSchema(editing);
			default:
				return Yup.object({
					type: Yup.string()
						.oneOf(["openai", "anthropic", "bedrock"])
						.required(),
				});
		}
	});

type ProviderFormProps = {
	editing?: boolean;
	/** When editing Bedrock and the API already has keys, show masked placeholders until cleared. */
	bedrockSavedAccessCredentials?: boolean;
	/** When editing openai/anthropic and a key is on file, show a masked placeholder until cleared. */
	openAiAnthropicSavedApiKey?: boolean;
	initialValues?: Partial<ProviderFormValues>;
	onSubmit?: (values: ProviderFormValues) => void;
	isLoading?: boolean;
	submitError?: unknown;
};

const namePlaceholder = (provider: string) => {
	switch (provider) {
		case "openai":
			return "openai";
		case "anthropic":
			return "anthropic";
		case "bedrock":
			return "bedrock";
	}
};

const apiKeyPlaceholder = (provider: string) => {
	switch (provider) {
		case "openai":
			return "sk-proj-...";
		case "anthropic":
			return "sk-ant-...";
	}
};

const baseUrlPlaceholder = (provider: string) => {
	switch (provider) {
		case "openai":
			return "https://api.openai.com";
		case "anthropic":
			return "https://api.anthropic.com";
		case "bedrock":
			return "https://bedrock-runtime.us-east-2.amazonaws.com";
		default:
			return;
	}
};

export const ProviderForm: FC<ProviderFormProps> = ({
	editing = false,
	bedrockSavedAccessCredentials = false,
	openAiAnthropicSavedApiKey = false,
	initialValues,
	onSubmit,
	isLoading = false,
	submitError,
}) => {
	const typeSelectId = useId();
	const enabledSwitchId = useId();

	// "Masked" means we're showing SAVED_CREDENTIAL_MASK in the inputs. The
	// first focus on a masked field clears it and flips the mask off so the
	// user can type a replacement; the explicit "Clear keys" button does the
	// same thing.
	const [bedrockKeysMasked, setBedrockKeysMasked] = useState(
		() => bedrockSavedAccessCredentials,
	);
	const [openAiAnthropicApiKeyMasked, setOpenAiAnthropicApiKeyMasked] =
		useState(() => openAiAnthropicSavedApiKey);

	useEffect(() => {
		setBedrockKeysMasked(bedrockSavedAccessCredentials);
	}, [bedrockSavedAccessCredentials]);

	useEffect(() => {
		setOpenAiAnthropicApiKeyMasked(openAiAnthropicSavedApiKey);
	}, [openAiAnthropicSavedApiKey]);

	const form = useFormik<ProviderFormValues>({
		initialValues: {
			...defaultInitialValues,
			...initialValues,
			// When the server has saved Bedrock credentials, seed the inputs
			// with the mask so the user sees something is on file. The mask
			// is replaced (cleared) on focus, and any "" submitted back is
			// treated by the API mapping as "keep the existing value".
			accessKey: bedrockSavedAccessCredentials ? SAVED_CREDENTIAL_MASK : "",
			accessKeySecret: bedrockSavedAccessCredentials
				? SAVED_CREDENTIAL_MASK
				: "",
			// Mirror the Bedrock pattern for openai/anthropic. A key on file is
			// shown as a mask; focusing or pressing "Clear key" clears it so the
			// user can type a replacement.
			apiKey: openAiAnthropicSavedApiKey ? SAVED_CREDENTIAL_MASK : "",
		},
		validationSchema: getProviderFormSchema(editing),
		onSubmit: onSubmit ?? (() => {}),
	});
	const getFieldHelpers = getFormHelpers(form, submitError);
	const typeField = getFieldHelpers("type");

	const typeSelectValue = form.values.type;

	const clearBedrockKeys = () => {
		void form.setFieldValue("accessKey", "");
		void form.setFieldValue("accessKeySecret", "");
		setBedrockKeysMasked(false);
	};

	const clearOpenAiAnthropicApiKey = () => {
		void form.setFieldValue("apiKey", "");
		setOpenAiAnthropicApiKeyMasked(false);
	};

	return (
		<Form onSubmit={form.handleSubmit}>
			<FormFields>
				{Boolean(submitError) && <ErrorAlert error={submitError} />}
				{!editing && (
					<div className="flex flex-col gap-2">
						<Label htmlFor={typeSelectId}>Type</Label>
						<div className="text-xs text-content-secondary">
							Select the type of provider you want to connect.
						</div>
						<Select
							value={typeSelectValue}
							onValueChange={(value) => {
								void form.setFieldValue("type", value);
							}}
						>
							<SelectTrigger
								id={typeSelectId}
								className={cn(
									"w-full",
									typeField.error && "border-border-destructive",
								)}
								aria-invalid={typeField.error}
								aria-describedby={
									typeField.error ? `${typeSelectId}-error` : undefined
								}
							>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="anthropic">
									<span className="flex items-center gap-2">
										<ProviderIcon provider="anthropic" />
										Anthropic
									</span>
								</SelectItem>
								<SelectItem value="openai">
									<span className="flex items-center gap-2">
										<ProviderIcon provider="openai" />
										OpenAI
									</span>
								</SelectItem>
								<SelectItem value="bedrock">
									<span className="flex items-center gap-2">
										<ProviderIcon provider="bedrock" />
										Bedrock
									</span>
								</SelectItem>
							</SelectContent>
						</Select>
						{typeField.error ? (
							<span
								id={`${typeSelectId}-error`}
								className="text-xs text-content-destructive"
							>
								{typeField.helperText}
							</span>
						) : null}
					</div>
				)}

				{(typeSelectValue === "openai" || typeSelectValue === "anthropic") && (
					<>
						<FormField
							required
							field={getFieldHelpers("name")}
							label="Name"
							description="The name of the provider. This is used to identify the provider in the UI."
							className="w-full"
							placeholder={namePlaceholder(form.values.type)}
						/>
						{/* API keys live on a sub-resource server-side; the parent
						    page chains POST /keys (and revokes the previous key when
						    rotating) after the provider PATCH succeeds. We treat an
						    untouched mask as "keep the existing key". */}
						<div className="flex flex-col gap-4">
							<FormField
								required
								field={getFieldHelpers("apiKey")}
								label="API key"
								type="password"
								description={
									editing && !openAiAnthropicApiKeyMasked
										? "Secret key used to authenticate requests to this provider, submitting replaces the existing key."
										: "Secret key used to authenticate requests to this provider."
								}
								className="w-full"
								autoComplete="new-password"
								onFocus={
									openAiAnthropicApiKeyMasked
										? clearOpenAiAnthropicApiKey
										: undefined
								}
								placeholder={apiKeyPlaceholder(form.values.type)}
							/>
							{openAiAnthropicApiKeyMasked && (
								<Button
									type="button"
									variant="outline"
									className="self-start"
									onClick={clearOpenAiAnthropicApiKey}
								>
									<TrashIcon />
									<span>Clear key</span>
								</Button>
							)}
						</div>
						<FormField
							field={getFieldHelpers("baseUrl")}
							label="Custom endpoint"
							description="Custom endpoint for this provider. Leave empty to use the default."
							className="w-full"
							placeholder={baseUrlPlaceholder(form.values.type)}
						/>
					</>
				)}

				{typeSelectValue === "bedrock" && (
					<>
						<FormField
							required
							field={getFieldHelpers("name")}
							label="Name"
							description="The name of the provider. This is used to identify the provider in the UI."
							className="w-full"
							placeholder={namePlaceholder(form.values.type)}
						/>
						<FormField
							required
							field={getFieldHelpers("baseUrl")}
							label="Base URL"
							description={
								<>
									In the format of{" "}
									<code>
										{"https://bedrock-runtime.{region}.amazonaws.com"}
									</code>
									.
								</>
							}
							className="w-full"
							placeholder={baseUrlPlaceholder(form.values.type)}
						/>
						<FormField
							required
							field={{
								...getFieldHelpers("model"),
								helperText: (
									<>
										Example:{" "}
										<code>anthropic.claude-3-5-sonnet-20241022-v2:0</code>
									</>
								),
							}}
							label="Model"
							description="The primary Bedrock model ID to use for chat/completions."
							className="w-full"
							placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
						/>
						<FormField
							required
							field={{
								...getFieldHelpers("smallFastModel"),
								helperText: (
									<>
										Example: <code>anthropic.claude-3-haiku-20240307-v1:0</code>
									</>
								),
							}}
							label="Small fast model"
							description="A lower-cost, lower-latency model used for lightweight requests such as summaries, titles, routing, or quick responses."
							className="w-full"
							placeholder="anthropic.claude-3-haiku-20240307-v1:0"
						/>
						<div className="flex flex-col gap-4">
							<FormField
								required
								field={getFieldHelpers("accessKey")}
								label="Access key"
								description={
									editing && !bedrockKeysMasked
										? "Your AWS Access Key ID used to authenticate requests to Bedrock, enter a new access key and secret together."
										: "Your AWS Access Key ID used to authenticate requests to Bedrock."
								}
								className="w-full"
								onFocus={bedrockKeysMasked ? clearBedrockKeys : undefined}
							/>
							<FormField
								required
								field={getFieldHelpers("accessKeySecret")}
								label="Access key secret"
								description="Your AWS Secret Access Key associated with the access key ID. Stored securely and used for request signing."
								type="password"
								className="w-full"
								autoComplete="new-password"
								onFocus={bedrockKeysMasked ? clearBedrockKeys : undefined}
							/>
							{bedrockKeysMasked && (
								<Button
									type="button"
									variant="outline"
									className="self-start"
									onClick={clearBedrockKeys}
								>
									<TrashIcon />
									<span>Clear keys</span>
								</Button>
							)}
						</div>
					</>
				)}

				<div className="flex items-center justify-between gap-4">
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<Label htmlFor={enabledSwitchId}>Enabled</Label>
						<p className="m-0 text-xs text-content-secondary">
							When disabled, this provider is not available for usage.
						</p>
					</div>
					<Switch
						id={enabledSwitchId}
						checked={form.values.enabled}
						onCheckedChange={(checked) => {
							void form.setFieldValue("enabled", checked);
						}}
						disabled={isLoading}
						aria-label="Provider enabled"
					/>
				</div>

				<div className="flex justify-end gap-4">
					<Link to="/ai/settings">
						<Button variant="outline" type="button">
							Cancel
						</Button>
					</Link>
					<Button disabled={isLoading} type="submit">
						<Spinner loading={isLoading} />
						{editing ? "Update provider" : "Add provider"}
					</Button>
				</div>
			</FormFields>
		</Form>
	);
};
