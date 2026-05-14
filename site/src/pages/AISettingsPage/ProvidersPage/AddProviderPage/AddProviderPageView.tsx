import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { ProviderForm } from "../components/ProviderForm";

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
			<div className="mx-auto w-full max-w-screen-sm flex flex-col gap-6">
				<PageHeader className="pt-6 pb-0">
					<PageHeaderTitle>Add a provider</PageHeaderTitle>
					<PageHeaderSubtitle>
						Connect third-party LLM services like OpenAI, Anthropic, or Google.
						Each provider supplies models that users can select for their
						conversations.
					</PageHeaderSubtitle>
				</PageHeader>
				<div className="border border-solid p-6 rounded-lg">
					<ProviderForm editing={false} />
				</div>
			</div>
		</>
	);
};

export default AddProviderPageView;
