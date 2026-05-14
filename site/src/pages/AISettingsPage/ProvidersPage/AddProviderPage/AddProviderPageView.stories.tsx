import type { Meta, StoryObj } from "@storybook/react-vite";
import { reactRouterParameters } from "storybook-addon-remix-react-router";
import { withToaster } from "#/testHelpers/storybook";
import AddProviderPageView from "./AddProviderPageView";

const meta: Meta<typeof AddProviderPageView> = {
	title: "pages/AISettingsPage/AddProviderPage",
	component: AddProviderPageView,
	decorators: [withToaster],
	parameters: {
		reactRouter: reactRouterParameters({
			location: { path: "/aisettings/add" },
			routing: [
				{ path: "/aisettings", useStoryElement: true },
				{ path: "/aisettings/add", useStoryElement: true },
			],
		}),
	},
};

export default meta;
type Story = StoryObj<typeof AddProviderPageView>;

export const Default: Story = {};
