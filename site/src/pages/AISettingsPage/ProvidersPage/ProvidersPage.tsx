import { useAuthenticated } from "#/hooks/useAuthenticated";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import { MOCK_READ_LIST_PROVIDERS } from "#/pages/AISettingsPage/mock";
import ProvidersPageView from "#/pages/AISettingsPage/ProvidersPage/ProvidersPageView";

const ProvidersPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	// TODO: We need to scope this permission.
	const hasPermission = permissions.viewAnyAIBridgeInterception;

	const { isLoading, isFetching, providers } = {
		isLoading: false,
		isFetching: false,
		providers: MOCK_READ_LIST_PROVIDERS,
	};

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<ProvidersPageView
				isLoading={isLoading}
				isFetching={isFetching}
				providers={providers}
			/>
		</RequirePermission>
	);
};

export default ProvidersPage;
