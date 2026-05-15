import { useQuery } from "react-query";
import { organizations } from "#/api/queries/organizations";
import { useAuthenticated } from "#/hooks/useAuthenticated";
import { useEmbeddedMetadata } from "#/hooks/useEmbeddedMetadata";
import { RequirePermission } from "#/modules/permissions/RequirePermission";
import AddProviderPageView from "./AddProviderPageView";

const AddProviderPage: React.FC = () => {
	const { permissions } = useAuthenticated();
	const { metadata } = useEmbeddedMetadata();
	const hasPermission = permissions.viewAnyAIProvider;

	const organizationsQuery = useQuery(organizations(metadata.organizations));

	return (
		<RequirePermission isFeatureVisible={hasPermission}>
			<AddProviderPageView organizations={organizationsQuery.data} />
		</RequirePermission>
	);
};

export default AddProviderPage;
