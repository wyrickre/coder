import { PlusIcon } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { AIProvider, Organization } from "#/api/typesGenerated";
import { Avatar } from "#/components/Avatar/Avatar";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/Select/Select";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/Table/Table";
import { TableEmpty } from "#/components/TableEmpty/TableEmpty";
import { TableLoader } from "#/components/TableLoader/TableLoader";
import { ProviderRow } from "#/pages/AISettingsPage/ProvidersPage/components/ProviderRow";

interface ProvidersPageViewProps {
	isLoading: boolean;
	isFetching: boolean;
	providers: AIProvider[];
	organizations: Organization[] | undefined;
}

const ProvidersPageView: React.FC<ProvidersPageViewProps> = ({
	isLoading,
	isFetching,
	providers,
	organizations,
}) => {
	const navigate = useNavigate();
	// TODO: GET /api/v2/ai/providers does not yet accept an organization
	// filter, so this picker is presentational only. Wire `selectedOrganizationId`
	// into the query (or the URL) once the server supports scoping.
	const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

	useLayoutEffect(() => {
		if (!organizations?.length) {
			setSelectedOrganizationId("");
			return;
		}
		setSelectedOrganizationId((prev) => {
			if (prev && organizations.some((o) => o.id === prev)) {
				return prev;
			}
			return organizations[0].id;
		});
	}, [organizations]);

	const hasOrganizations = Boolean(organizations?.length);

	return (
		<>
			<PageHeader
				className="pt-4 pb-8"
				actions={
					<>
						<Select
							value={hasOrganizations ? selectedOrganizationId : undefined}
							onValueChange={setSelectedOrganizationId}
							disabled={!hasOrganizations}
						>
							<SelectTrigger className="w-56 min-w-0">
								<SelectValue placeholder="Select organization" />
							</SelectTrigger>
							<SelectContent>
								{organizations?.map((organization) => (
									<SelectItem key={organization.id} value={organization.id}>
										<span className="flex items-center gap-2">
											<Avatar
												variant="icon"
												size="sm"
												src={organization.icon}
												fallback={
													organization.display_name || organization.name
												}
											/>
											<span className="truncate">
												{organization.display_name || organization.name}
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Link to="/ai/settings/add">
							<Button>
								<PlusIcon />
								<span>Add provider</span>
							</Button>
						</Link>
					</>
				}
			>
				<PageHeaderTitle>Providers</PageHeaderTitle>
				<PageHeaderSubtitle>
					Connect third-party LLM services like OpenAI, Anthropic, or Amazon
					Bedrock. Each provider supplies models that users can select for their
					conversations.
				</PageHeaderSubtitle>
			</PageHeader>
			<Table className="table-fixed" aria-label="AI providers">
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Base URL</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading || isFetching ? (
						<TableLoader />
					) : providers.length === 0 ? (
						<TableEmpty message="No providers available" />
					) : (
						providers.map((provider) => (
							<ProviderRow
								key={provider.name}
								provider={provider}
								onClick={() => navigate(`/ai/settings/${provider.name}`)}
							/>
						))
					)}
				</TableBody>
			</Table>
		</>
	);
};

export default ProvidersPageView;
