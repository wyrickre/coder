import { useAuthenticated } from "#/hooks/useAuthenticated";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import UpdateProviderPageView from "#/pages/AIGovernancePage/UpdateProviderPage/UpdateProviderPageView";

const UpdateProviderPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	const hasPermission = permissions.viewAnyAIBridgeInterception;

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<UpdateProviderPageView />
		</RequirePermission>
	);
};

export default UpdateProviderPage;
