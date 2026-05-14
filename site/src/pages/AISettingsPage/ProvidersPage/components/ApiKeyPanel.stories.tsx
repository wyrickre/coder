import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	MockAIProviderKey,
	MockAIProviderOpenAI,
} from "#/testHelpers/entities";
import { ApiKeyPanel } from "./ApiKeyPanel";

const keysQueryKey = ["ai", "providers", MockAIProviderOpenAI.id, "keys"];

const meta: Meta<typeof ApiKeyPanel> = {
	title: "pages/AISettingsPage/ApiKeyPanel",
	component: ApiKeyPanel,
	args: {
		provider: MockAIProviderOpenAI,
	},
};

export default meta;
type Story = StoryObj<typeof ApiKeyPanel>;

export const NoKey: Story = {
	parameters: {
		queries: [{ key: keysQueryKey, data: [] }],
	},
};

export const KeyConfigured: Story = {
	parameters: {
		queries: [{ key: keysQueryKey, data: [MockAIProviderKey] }],
	},
};

export const MultipleKeysWarning: Story = {
	parameters: {
		queries: [
			{
				key: keysQueryKey,
				data: [
					MockAIProviderKey,
					{
						...MockAIProviderKey,
						id: "9e4d5c6b-7a8f-4e3d-9c2a-1b3c5d7e9f02",
						created_at: "2026-05-13T10:00:00Z",
					},
					{
						...MockAIProviderKey,
						id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c03",
						created_at: "2026-05-12T10:00:00Z",
					},
				],
			},
		],
	},
};

export const Loading: Story = {};
