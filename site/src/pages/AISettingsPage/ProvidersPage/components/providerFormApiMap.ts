import type { AIProvider, CreateAIProviderRequest } from "#/api/api";
import type { ProviderFormValues } from "./ProviderForm";
import { isCredentialPlaceholder } from "./providerCredentialPlaceholder";

/** Bedrock row has any non-empty access key or secret from the API. */
export function hasBedrockStoredCredentials(provider: AIProvider): boolean {
	if (provider.type !== "bedrock" || !provider.settings) {
		return false;
	}
	const s = provider.settings;
	const ak = s.access_keys?.[0]?.trim() ?? "";
	const sk = s.access_key_secrets?.[0]?.trim() ?? "";
	return ak !== "" || sk !== "";
}

export function providerFormValuesToCreateRequest(
	values: ProviderFormValues,
	existingProvider?: AIProvider,
): CreateAIProviderRequest {
	if (values.type === "bedrock") {
		const settingsCommon = {
			_type: "bedrock" as const,
			_version: "1",
			model: values.model,
			small_fast_model: values.smallFastModel,
		};
		const hasNewCredentials =
			!isCredentialPlaceholder(values.accessKey) &&
			!isCredentialPlaceholder(values.accessKeySecret);

		let access_keys: string[];
		let access_key_secrets: string[];
		if (hasNewCredentials) {
			access_keys = [values.accessKey.trim()];
			access_key_secrets = [values.accessKeySecret.trim()];
		} else if (
			existingProvider?.type === "bedrock" &&
			existingProvider.settings
		) {
			const prev = existingProvider.settings;
			access_keys = [...(prev.access_keys ?? [])];
			access_key_secrets = [...(prev.access_key_secrets ?? [])];
		} else {
			access_keys = [values.accessKey.trim()];
			access_key_secrets = [values.accessKeySecret.trim()];
		}

		return {
			type: "bedrock",
			name: values.name,
			display_name: values.name,
			base_url: values.baseUrl,
			enabled: values.enabled,
			settings: {
				...settingsCommon,
				access_keys,
				access_key_secrets,
			},
		};
	}

	return {
		type: values.type as "openai" | "anthropic",
		name: values.name,
		display_name: values.name,
		base_url: values.baseURL,
		enabled: values.enabled,
		settings: null,
	};
}

export function aiProviderToFormValues(
	provider: AIProvider,
): Partial<ProviderFormValues> {
	if (provider.type === "bedrock" && provider.settings) {
		const s = provider.settings;
		return {
			type: "bedrock",
			name: provider.name,
			baseUrl: provider.base_url,
			model: s.model,
			smallFastModel: s.small_fast_model,
			accessKey: "",
			accessKeySecret: "",
			enabled: provider.enabled,
		};
	}

	return {
		type: provider.type === "openai" ? "openai" : "anthropic",
		name: provider.name,
		baseURL: provider.base_url,
		enabled: provider.enabled,
	};
}
