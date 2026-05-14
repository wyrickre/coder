import { useQuery } from "react-query";
import { aiProvidersList } from "#/api/queries/aiProviders";
import { useAuthenticated } from "#/hooks/useAuthenticated";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import ProvidersPageView from "#/pages/AISettingsPage/ProvidersPage/ProvidersPageView";

const ProvidersPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	// TODO: We need to scope this permission.
	const hasPermission = permissions.viewAnyAIBridgeInterception;

	const providersQuery = useQuery(aiProvidersList());

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<ProvidersPageView
				isLoading={providersQuery.isLoading}
				isFetching={providersQuery.isFetching}
				providers={providersQuery.data ?? []}
			/>
		</RequirePermission>
	);
};

export default ProvidersPage;
