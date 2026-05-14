import {
	Sidebar as BaseSidebar,
	SettingsSidebarNavItem as SidebarNavItem,
} from "#/components/Sidebar/Sidebar";

const AISettingsSidebarView: React.FC = () => {
	return (
		<BaseSidebar>
			<div className="flex flex-col gap-1">
				<SidebarNavItem href="/aisettings">Providers</SidebarNavItem>
			</div>
		</BaseSidebar>
	);
};

export default AISettingsSidebarView;
