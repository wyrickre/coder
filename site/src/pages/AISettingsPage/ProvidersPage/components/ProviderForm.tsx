import { useFormik } from "formik";
import { type FC, useId } from "react";
import { Link } from "react-router";
import * as Yup from "yup";
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
};

// Public AWS partition Bedrock Runtime API base URL, for example
// https://bedrock-runtime.us-east-2.amazonaws.com
const bedrockRuntimeBaseUrlRegex =
	/^https:\/\/bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com\/?$/i;

const defaultInitialValues: ProviderFormValues = {
	type: "anthropic",
	name: "",
	baseURL: "",
	baseUrl: "",
	model: "",
	smallFastModel: "",
	accessKey: "",
	accessKeySecret: "",
};

const openaiAnthropicSchema = Yup.object({
	type: Yup.string()
		.oneOf(["openai", "anthropic"] as const)
		.required(),
	name: Yup.string().required("Name is required"),
	baseURL: Yup.string().required("Base URL is required"),
});

const bedrockSchema = Yup.object({
	type: Yup.string()
		.oneOf(["bedrock"] as const)
		.required(),
	baseUrl: Yup.string()
		.url("Base URL must be a valid URL")
		.matches(
			bedrockRuntimeBaseUrlRegex,
			"Base URL must be a valid Bedrock Runtime API base URL",
		)
		.required("Base URL is required"),
	model: Yup.string().required("Model is required"),
	smallFastModel: Yup.string().required("Small fast model is required"),
	accessKey: Yup.string().required("Access key is required"),
	accessKeySecret: Yup.string().required("Access key secret is required"),
});

export const providerFormSchema = Yup.lazy(
	(value: { type?: string } | undefined) => {
		switch (value?.type) {
			case "openai":
			case "anthropic":
				return openaiAnthropicSchema;
			case "bedrock":
				return bedrockSchema;
			default:
				return Yup.object({
					type: Yup.string()
						.oneOf(["openai", "anthropic", "bedrock"])
						.required(),
				});
		}
	},
);

type ProviderFormProps = {
	editing?: boolean;
	initialValues?: Partial<ProviderFormValues>;
	onSubmit?: (values: ProviderFormValues) => void;
	isLoading?: boolean;
};

export const ProviderForm: FC<ProviderFormProps> = ({
	editing = false,
	initialValues,
	onSubmit,
	isLoading = false,
}) => {
	const typeSelectId = useId();
	const form = useFormik<ProviderFormValues>({
		initialValues: { ...defaultInitialValues, ...initialValues },
		validationSchema: providerFormSchema,
		onSubmit: onSubmit ?? (() => {}),
		enableReinitialize: initialValues !== undefined,
	});
	const getFieldHelpers = getFormHelpers(form);
	const typeField = getFieldHelpers("type");

	const typeSelectValue = form.values.type;

	return (
		<Form onSubmit={form.handleSubmit}>
			<FormFields>
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
							<SelectItem value="anthropic">Anthropic</SelectItem>
							<SelectItem value="openai">OpenAI</SelectItem>
							<SelectItem value="bedrock">Bedrock</SelectItem>
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
							field={{
								...getFieldHelpers("baseUrl"),
							}}
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
						<FormField
							field={getFieldHelpers("accessKey")}
							label="Access key"
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
