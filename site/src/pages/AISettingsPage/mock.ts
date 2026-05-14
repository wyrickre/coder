export const MOCK_READ_LIST_PROVIDERS = [
	{
		type: "openai",
		name: "openai",
		display_name: "OpenAI",
		base_url: "https://api.openai.com",
		api_keys: ["abcd....wxyz"], // masked API key(s)
		settings: null,
		enabled: false,
		created_at: "...UTC",
		updated_at: "...UTC",
	},
	{
		type: "anthropic",
		name: "bedrock",
		display_name: "Bedrock",
		base_url: "https://bedrock-runtime.us-east-2.amazonaws.com",
		api_key: [], // empty set for bedrock
		settings: {
			_type: "bedrock", // identifies JSON payload type
			_version: "1", // identifies JSON payload version
			access_keys: ["abcd....wxyz"], // masked API key(s)
			access_key_secrets: ["abcd....wxyz"], // masked API key secret(s)
			model: "anthropic.claude-opus-4-7",
			small_fast_model: "anthropic.claude-haiku-4-5",
		},
		enabled: true,
		created_at: "...UTC",
		updated_at: "...UTC",
	},
];
