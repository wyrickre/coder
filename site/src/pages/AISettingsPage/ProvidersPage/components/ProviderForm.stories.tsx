import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ProviderForm } from "./ProviderForm";

const meta: Meta<typeof ProviderForm> = {
	title: "pages/AISettingsPage/ProviderForm",
	component: ProviderForm,
	args: {
		editing: false,
		isLoading: false,
		onSubmit: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof ProviderForm>;

export const AddAnthropicDefault: Story = {};

export const AddOpenAI: Story = {
	args: {
		initialValues: {
			type: "openai",
			name: "Corporate OpenAI",
			baseURL: "https://api.openai.com/v1",
			enabled: true,
		},
	},
};

export const AddBedrock: Story = {
	args: {
		initialValues: {
			type: "bedrock",
			baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
			model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
			smallFastModel: "anthropic.claude-3-5-haiku-20241022-v1:0",
			accessKey: "AKIAIOSFODNN7EXAMPLE",
			accessKeySecret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			enabled: true,
		},
	},
};

export const EditProvider: Story = {
	args: {
		editing: true,
		initialValues: {
			type: "anthropic",
			name: "production-anthropic",
			baseURL: "https://api.anthropic.com",
			enabled: true,
		},
	},
};

export const Submitting: Story = {
	args: {
		isLoading: true,
		initialValues: {
			type: "openai",
			name: "openai",
			baseURL: "https://api.openai.com/v1",
		},
	},
};
