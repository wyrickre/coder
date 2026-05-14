import type { Meta, StoryObj } from "@storybook/react-vite";
import { reactRouterParameters } from "storybook-addon-remix-react-router";
import UpdateProviderPageView from "./UpdateProviderPageView";

const meta: Meta<typeof UpdateProviderPageView> = {
	title: "pages/AISettingsPage/UpdateProviderPageView",
	component: UpdateProviderPageView,
	parameters: {
		reactRouter: reactRouterParameters({
			location: { path: "/aisettings/openai" },
			routing: [
				{ path: "/aisettings", useStoryElement: true },
				{ path: "/aisettings/:providerId", useStoryElement: true },
			],
		}),
	},
};

export default meta;
type Story = StoryObj<typeof UpdateProviderPageView>;

export const Default: Story = {};
