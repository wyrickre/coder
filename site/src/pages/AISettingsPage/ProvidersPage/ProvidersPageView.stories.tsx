import type { Meta, StoryObj } from "@storybook/react-vite";
import { reactRouterParameters } from "storybook-addon-remix-react-router";
import { MOCK_READ_LIST_PROVIDERS } from "#/pages/AISettingsPage/mock";
import ProvidersPageView from "./ProvidersPageView";

const meta: Meta<typeof ProvidersPageView> = {
	title: "pages/AISettingsPage/ProvidersPageView",
	component: ProvidersPageView,
	args: {
		isLoading: false,
		isFetching: false,
		providers: MOCK_READ_LIST_PROVIDERS,
	},
	parameters: {
		reactRouter: reactRouterParameters({
			location: { path: "/aisettings" },
			routing: [
				{ path: "/aisettings", useStoryElement: true },
				{ path: "/aisettings/add", useStoryElement: true },
				{ path: "/aisettings/:providerId", useStoryElement: true },
			],
		}),
	},
};

export default meta;
type Story = StoryObj<typeof ProvidersPageView>;

export const Default: Story = {};

export const Loading: Story = {
	args: {
		isLoading: true,
		isFetching: true,
	},
};

export const EmptyProviders: Story = {
	args: {
		providers: [],
	},
};
