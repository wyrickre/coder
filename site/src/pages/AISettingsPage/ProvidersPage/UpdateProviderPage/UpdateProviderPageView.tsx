import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "#/components/Avatar/Avatar";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { MOCK_READ_LIST_PROVIDERS } from "#/pages/AISettingsPage/mock";
import { ProviderForm } from "#/pages/AISettingsPage/ProvidersPage/components/ProviderForm";
import { getProviderIcon } from "#/pages/AISettingsPage/ProvidersPage/components/ProviderIcon";

const UpdateProviderPageView: React.FC = () => {
	const { provider } = {
		provider: MOCK_READ_LIST_PROVIDERS[0],
	};

	return (
		<>
			<div className="pt-4 px-6">
				<Link to="/aisettings">
					<Button variant="subtle">
						<ArrowLeftIcon />
						<span>Back to providers</span>
					</Button>
				</Link>
			</div>
			<div className="mx-auto w-full max-w-screen-sm flex flex-col gap-6">
				<PageHeader className="pt-6 pb-0">
					<div className="flex items-center gap-4">
						<Avatar
							variant="icon"
							size="lg"
							src={getProviderIcon(provider.type)}
						/>
						<PageHeaderTitle>{provider.name}</PageHeaderTitle>
					</div>
				</PageHeader>
				<div className="border border-solid p-6 rounded-lg">
					<ProviderForm editing={true} />
				</div>
			</div>
		</>
	);
};

export default UpdateProviderPageView;
