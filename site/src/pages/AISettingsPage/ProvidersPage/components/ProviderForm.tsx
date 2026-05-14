import { useFormik } from "formik";
import { TrashIcon } from "lucide-react";
import { type FC, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import * as Yup from "yup";
import { ErrorAlert } from "#/components/Alert/ErrorAlert";
import { Button } from "#/components/Button/Button";
import { Form, FormFields } from "#/components/Form/Form";
import { FormField } from "#/components/FormField/FormField";
import { Input } from "#/components/Input/Input";
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
import { isCredentialPlaceholder } from "#/pages/AISettingsPage/ProvidersPage/components/providerCredentialPlaceholder";
import { cn } from "#/utils/cn";
import { getFormHelpers } from "#/utils/formUtils";

export type ProviderFormValues = {
	type: "" | "openai" | "anthropic" | "bedrock";
	name: string;
	baseURL: string;
	baseUrl: string;
	model: string;
	smallFastModel: string;
	accessKey: string;
	accessKeySecret: string;
	enabled: boolean;
};

// Public AWS partition Bedrock Runtime API base URL, for example
// https://bedrock-runtime.us-east-2.amazonaws.com
const bedrockRuntimeBaseUrlRegex =
	/^https:\/\/bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com\/?$/i;

/** Dummy value so read-only password inputs show a stable mask (not real credentials). */
const BEDROCK_OMITTED_CREDENTIAL_DISPLAY = "********";

const defaultInitialValues: ProviderFormValues = {
	type: "anthropic",
	name: "",
	baseURL: "",
	baseUrl: "",
	model: "",
	smallFastModel: "",
	accessKey: "",
	accessKeySecret: "",
	enabled: false,
};

const openaiAnthropicSchema = Yup.object({
	type: Yup.string()
		.oneOf(["openai", "anthropic"] as const)
		.required(),
	name: Yup.string().required("Name is required"),
	baseURL: Yup.string().required("Base URL is required"),
	enabled: Yup.boolean(),
});

const makeBedrockSchema = (editing: boolean) => {
	const base = Yup.object({
		type: Yup.string()
			.oneOf(["bedrock"] as const)
			.required(),
		name: Yup.string().required("Name is required"),
		baseUrl: Yup.string()
			.url("Base URL must be a valid URL")
			.matches(
				bedrockRuntimeBaseUrlRegex,
				"Base URL must be a valid Bedrock Runtime API base URL",
			)
			.required("Base URL is required"),
		model: Yup.string().required("Model is required"),
		smallFastModel: Yup.string().required("Small fast model is required"),
		accessKey: editing
			? Yup.string()
			: Yup.string().required("Access key is required"),
		accessKeySecret: editing
			? Yup.string()
			: Yup.string().required("Access key secret is required"),
		enabled: Yup.boolean(),
	});
	if (!editing) {
		return base;
	}
	return base.test(
		"bedrock-access-keys-pair",
		"Replace access key and secret together, or leave both blank or as the saved placeholders.",
		(value) => {
			const kp = isCredentialPlaceholder(value.accessKey ?? "");
			const sp = isCredentialPlaceholder(value.accessKeySecret ?? "");
			if (kp && sp) {
				return true;
			}
			if (!kp && !sp) {
				return true;
			}
			return false;
		},
	);
};

export const getProviderFormSchema = (editing: boolean) =>
	Yup.lazy((value: { type?: string } | undefined) => {
		switch (value?.type) {
			case "openai":
			case "anthropic":
				return openaiAnthropicSchema;
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

/** Schema for add-provider flow (Bedrock access fields required). */
export const providerFormSchema = getProviderFormSchema(false);

type ProviderFormProps = {
	editing?: boolean;
	/** When editing Bedrock and the API already has keys, show masked placeholders until cleared. */
	bedrockSavedAccessCredentials?: boolean;
	initialValues?: Partial<ProviderFormValues>;
	onSubmit?: (values: ProviderFormValues) => void;
	isLoading?: boolean;
	submitError?: unknown;
};

export const ProviderForm: FC<ProviderFormProps> = ({
	editing = false,
	bedrockSavedAccessCredentials = false,
	initialValues,
	onSubmit,
	isLoading = false,
	submitError,
}) => {
	const typeSelectId = useId();
	const enabledSwitchId = useId();
	const omittedAccessKeyId = useId();
	const omittedSecretId = useId();

	const [bedrockKeysUnlocked, setBedrockKeysUnlocked] = useState(
		() => !bedrockSavedAccessCredentials,
	);

	useEffect(() => {
		setBedrockKeysUnlocked(!bedrockSavedAccessCredentials);
	}, [bedrockSavedAccessCredentials]);

	const showBedrockOmittedCredentials =
		editing && bedrockSavedAccessCredentials && !bedrockKeysUnlocked;

	const form = useFormik<ProviderFormValues>({
		initialValues: { ...defaultInitialValues, ...initialValues },
		validationSchema: getProviderFormSchema(editing),
		onSubmit: onSubmit ?? (() => {}),
		enableReinitialize: initialValues !== undefined,
	});
	const getFieldHelpers = getFormHelpers(form, submitError);
	const typeField = getFieldHelpers("type");

	const typeSelectValue = form.values.type;

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
							field={getFieldHelpers("name")}
							label="Name"
							description="The name of the provider. This is used to identify the provider in the UI."
							className="w-full"
						/>
						<FormField
							field={getFieldHelpers("baseURL")}
							label="Base URL"
							description="Custom endpoint for this provider. Leave empty to use the default."
							className="w-full"
						/>
					</>
				)}

				{typeSelectValue === "bedrock" && (
					<>
						<FormField
							field={getFieldHelpers("name")}
							label="Name"
							description="The name of the provider. This is used to identify the provider in the UI."
							className="w-full"
						/>
						<FormField
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
						/>
						<FormField
							field={getFieldHelpers("model")}
							label="Model"
							className="w-full"
						/>
						<FormField
							field={getFieldHelpers("smallFastModel")}
							label="Small fast model"
							className="w-full"
						/>
						{showBedrockOmittedCredentials ? (
							<div className="flex flex-col gap-4">
								<p className="m-0 text-xs text-content-secondary">
									A saved access key and secret are on file. Clear them to enter
									new credentials.
								</p>
								<div className="flex flex-col gap-2">
									<Label htmlFor={omittedAccessKeyId}>Access key</Label>
									<Input
										id={omittedAccessKeyId}
										type="password"
										readOnly
										tabIndex={-1}
										value={BEDROCK_OMITTED_CREDENTIAL_DISPLAY}
										autoComplete="off"
										aria-label="Access key on file (hidden)"
										className="text-content-secondary"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor={omittedSecretId}>Access key secret</Label>
									<Input
										id={omittedSecretId}
										type="password"
										readOnly
										tabIndex={-1}
										value={BEDROCK_OMITTED_CREDENTIAL_DISPLAY}
										autoComplete="off"
										aria-label="Access key secret on file (hidden)"
										className="text-content-secondary"
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									className="self-start"
									onClick={() => {
										void form.setFieldValue("accessKey", "");
										void form.setFieldValue("accessKeySecret", "");
										setBedrockKeysUnlocked(true);
									}}
								>
									<TrashIcon />
									<span>Reset keys</span>
								</Button>
							</div>
						) : (
							<>
								<FormField
									field={getFieldHelpers("accessKey")}
									label="Access key"
									description={
										editing && bedrockKeysUnlocked
											? "Enter a new access key and secret together."
											: undefined
									}
									className="w-full"
								/>
								<FormField
									field={getFieldHelpers("accessKeySecret")}
									label="Access key secret"
									type="password"
									className="w-full"
									autoComplete="new-password"
								/>
							</>
						)}
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
					<Link to="/aisettings">
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
