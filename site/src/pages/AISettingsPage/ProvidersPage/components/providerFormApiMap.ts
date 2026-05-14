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

/** OpenAI or Anthropic row has a non-empty API key from the API. */
export function hasOpenAiAnthropicStoredApiKey(provider: AIProvider): boolean {
	if (provider.type !== "openai" && provider.type !== "anthropic") {
		return false;
	}
	const keys = provider.api_keys ?? provider.api_key ?? [];
	return Boolean(keys[0]?.trim());
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

	const hasNewApiKey = !isCredentialPlaceholder(values.apiKey);
	let api_keys: string[] | undefined;
	if (hasNewApiKey) {
		api_keys = [values.apiKey.trim()];
	} else if (
		(existingProvider?.type === "openai" ||
			existingProvider?.type === "anthropic") &&
		(existingProvider.api_keys?.some((k) => k?.trim()) ||
			existingProvider.api_key?.some((k) => k?.trim()))
	) {
		const prev = [
			...(existingProvider.api_keys ?? existingProvider.api_key ?? []),
		];
		api_keys = prev.length > 0 ? prev : undefined;
	} else if (values.apiKey.trim() !== "") {
		api_keys = [values.apiKey.trim()];
	}

	return {
		type: values.type as "openai" | "anthropic",
		name: values.name,
		display_name: values.name,
		base_url: values.baseURL,
		enabled: values.enabled,
		settings: null,
		...(api_keys !== undefined && api_keys.length > 0 ? { api_keys } : {}),
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
		apiKey: "",
		enabled: provider.enabled,
	};
}
