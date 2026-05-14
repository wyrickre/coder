import { ArrowLeftIcon } from "lucide-react";
import { useMutation, useQueryClient } from "react-query";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "#/api/errors";
import { createAIProviderMutation } from "#/api/queries/aiProviders";
import { Button } from "#/components/Button/Button";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { ProviderForm } from "../components/ProviderForm";
import { providerFormValuesToCreateRequest } from "../components/providerFormApiMap";

const AddProviderPageView: React.FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createMutation = useMutation(createAIProviderMutation(queryClient));

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
					<ProviderForm
						editing={false}
						isLoading={createMutation.isPending}
						submitError={createMutation.error}
						onSubmit={(values) => {
							createMutation.mutate(providerFormValuesToCreateRequest(values), {
								onSuccess: (res) => {
									toast.success("Provider added.");
									void navigate(`/aisettings/${res.name}`);
								},
								onError: (error) => {
									toast.error(
										getErrorMessage(error, "Failed to add provider."),
									);
								},
							});
						}}
					/>
				</div>
			</div>
		</>
	);
};

export default AddProviderPageView;
