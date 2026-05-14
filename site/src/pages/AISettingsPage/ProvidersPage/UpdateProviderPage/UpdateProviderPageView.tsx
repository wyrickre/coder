import { ArrowLeftIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "#/api/errors";
import {
	aiProvidersList,
	updateAIProviderMutation,
} from "#/api/queries/aiProviders";
import { Avatar } from "#/components/Avatar/Avatar";
import { Button } from "#/components/Button/Button";
import { Loader } from "#/components/Loader/Loader";
import {
	PageHeader,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { ProviderForm } from "../components/ProviderForm";
import { getProviderIcon } from "../components/ProviderIcon";
import {
	aiProviderToFormValues,
	providerFormValuesToCreateRequest,
} from "../components/providerFormApiMap";

const UpdateProviderPageView: React.FC = () => {
	const { providerId } = useParams<{ providerId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const providersQuery = useQuery(aiProvidersList());
	const provider = providersQuery.data?.find((p) => p.name === providerId);

	const updateMutation = useMutation(
		updateAIProviderMutation(queryClient, providerId ?? ""),
	);

	if (providersQuery.isLoading) {
		return <Loader fullscreen />;
	}

	if (!providerId || !provider) {
		return <Navigate to="/aisettings" replace />;
	}

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
					<ProviderForm
						editing
						initialValues={aiProviderToFormValues(provider)}
						isLoading={updateMutation.isPending}
						submitError={updateMutation.error}
						onSubmit={(values) => {
							updateMutation.mutate(providerFormValuesToCreateRequest(values), {
								onSuccess: () => {
									toast.success("Provider updated.");
								},
								onError: (error) => {
									toast.error(
										getErrorMessage(error, "Failed to update provider."),
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

export default UpdateProviderPageView;
