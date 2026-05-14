import { PlusIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "#/components/Button/Button";
import { Margins } from "#/components/Margins/Margins";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/Table/Table";
import { TableEmpty } from "#/components/TableEmpty/TableEmpty";
import { TableLoader } from "#/components/TableLoader/TableLoader";
import type { MOCK_READ_LIST_PROVIDERS } from "#/pages/AIGovernancePage/mock";
import { ProviderRow } from "#/pages/AIGovernancePage/ProvidersPage/ProviderRow";

interface ProvidersPageViewProps {
	isLoading: boolean;
	isFetching: boolean;
	providers: (typeof MOCK_READ_LIST_PROVIDERS)[number][];
}

const ProvidersPageView: React.FC<ProvidersPageViewProps> = ({
	isLoading,
	isFetching,
	providers,
}) => {
	const navigate = useNavigate();

	return (
		<Margins>
			<PageHeader
				actions={
					<Link to="/aigovernance/add">
						<Button>
							<PlusIcon />
							<span>Add provider</span>
						</Button>
					</Link>
				}
			>
				<PageHeaderTitle>Providers</PageHeaderTitle>
				<PageHeaderSubtitle>
					Connect third-party LLM services like OpenAI, Anthropic, or Google.
					Each provider supplies models that users can select for their
					conversations.
				</PageHeaderSubtitle>
			</PageHeader>
			<Table className="table-fixed">
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
								onClick={() => navigate(`/aigovernance/${provider.name}`)}
							/>
						))
					)}
				</TableBody>
			</Table>
		</Margins>
	);
};

export default ProvidersPageView;
