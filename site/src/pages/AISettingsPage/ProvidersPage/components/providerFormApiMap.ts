import type { AIProvider, CreateAIProviderRequest } from "#/api/api";
import type { ProviderFormValues } from "./ProviderForm";

function isMaskedCredential(value: string): boolean {
	return value.includes("...");
}

export function providerFormValuesToCreateRequest(
	values: ProviderFormValues,
): CreateAIProviderRequest {
	if (values.type === "bedrock") {
		return {
			type: "bedrock",
			name: values.name,
			display_name: values.name,
			base_url: values.baseUrl,
			enabled: values.enabled,
			settings: {
				_type: "bedrock",
				_version: "1",
				model: values.model,
				small_fast_model: values.smallFastModel,
				access_keys: [values.accessKey],
				access_key_secrets: [values.accessKeySecret],
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
		const accessKey = s.access_keys?.[0] ?? "";
		const secretFromApi = s.access_key_secrets?.[0] ?? "";
		return {
			type: "bedrock",
			name: provider.name,
			baseUrl: provider.base_url,
			model: s.model,
			smallFastModel: s.small_fast_model,
			accessKey: isMaskedCredential(accessKey) ? "" : accessKey,
			accessKeySecret: isMaskedCredential(secretFromApi) ? "" : secretFromApi,
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
