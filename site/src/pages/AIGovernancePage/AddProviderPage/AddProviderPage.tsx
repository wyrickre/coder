import { useAuthenticated } from "#/hooks/useAuthenticated";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import AddProviderPageView from "#/pages/AIGovernancePage/AddProviderPage/AddProviderPageView";

const AddProviderPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	// TODO: We need to scope this permission.
	const hasPermission = permissions.viewAnyAIBridgeInterception;

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<AddProviderPageView />
		</RequirePermission>
	);
};

export default AddProviderPage;
