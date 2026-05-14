import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Table, TableBody } from "#/components/Table/Table";
import { MOCK_READ_LIST_PROVIDERS } from "#/pages/AISettingsPage/mock";
import { ProviderRow } from "./ProviderRow";

const meta: Meta<typeof ProviderRow> = {
	title: "pages/AISettingsPage/ProviderRow",
	component: ProviderRow,
	args: {
		onClick: fn(),
	},
	decorators: [
		(Story) => (
			<Table>
				<TableBody>
					<Story />
				</TableBody>
			</Table>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ProviderRow>;

export const OpenAI: Story = {
	args: {
		provider: MOCK_READ_LIST_PROVIDERS[0],
	},
};

export const Anthropic: Story = {
	args: {
		provider: MOCK_READ_LIST_PROVIDERS[1],
	},
};

export const Bedrock: Story = {
	args: {
		provider: MOCK_READ_LIST_PROVIDERS[2],
	},
};
