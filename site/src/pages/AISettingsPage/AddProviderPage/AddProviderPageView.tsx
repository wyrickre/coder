import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";

const AddProviderPageView: React.FC = () => {
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
			<div className="mx-auto w-full max-w-screen-sm">
				<PageHeader className="pt-6 pb-0">
					<PageHeaderTitle>Add a provider</PageHeaderTitle>
					<PageHeaderSubtitle>
						Add a new provider to the AI governance system.
					</PageHeaderSubtitle>
				</PageHeader>
			</div>
		</>
	);
};

export default AddProviderPageView;
