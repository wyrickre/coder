import { useAuthenticated } from "#/hooks/useAuthenticated";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import ProvidersPageView from "#/pages/AIGovernancePage/ProvidersPage/ProvidersPageView";

const ProvidersPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	// TODO: We need to scope this permission.
	const hasPermission = permissions.viewAnyAIBridgeInterception;

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<ProvidersPageView />
		</RequirePermission>
	);
};

export default ProvidersPage;
