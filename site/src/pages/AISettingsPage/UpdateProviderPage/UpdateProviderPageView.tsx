import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";

const UpdateProviderPageView: React.FC = () => {
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
					<PageHeaderTitle>Update a provider</PageHeaderTitle>
				</PageHeader>
			</div>
		</>
	);
};

export default UpdateProviderPageView;
