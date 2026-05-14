import { isAxiosError } from "axios";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "#/api/errors";
import {
	aiProvider,
	deleteAIProviderMutation,
	updateAIProviderMutation,
} from "#/api/queries/aiProviders";
import { Avatar } from "#/components/Avatar/Avatar";
import { Button } from "#/components/Button/Button";
import { DeleteDialog } from "#/components/Dialogs/DeleteDialog/DeleteDialog";
import { Loader } from "#/components/Loader/Loader";
import {
	PageHeader,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { ProviderForm } from "../components/ProviderForm";
import { getProviderIcon } from "../components/ProviderIcon";
import {
	aiProviderToFormValues,
	hasBedrockStoredCredentials,
	providerFormValuesToUpdate,
} from "../components/providerFormApiMap";

const UpdateProviderPageView: React.FC = () => {
	const { providerId } = useParams<{ providerId: string }>();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const providerQuery = useQuery({
		...aiProvider(providerId ?? ""),
		enabled: Boolean(providerId),
	});

	const updateMutation = useMutation(
		updateAIProviderMutation(queryClient, providerId ?? ""),
	);

	const deleteMutation = useMutation(
		deleteAIProviderMutation(queryClient, providerId ?? ""),
	);

	if (!providerId) {
		return <Navigate to="/aisettings" replace />;
	}

	if (providerQuery.isLoading) {
		return <Loader fullscreen />;
	}

	if (providerQuery.isError) {
		const status = isAxiosError(providerQuery.error)
			? providerQuery.error.response?.status
			: undefined;
		if (status === 404) {
			return <Navigate to="/aisettings" replace />;
		}
		return (
			<div className="pt-4 px-6 flex flex-col gap-4">
				<p className="text-content-secondary">
					{getErrorMessage(providerQuery.error, "Failed to load provider.")}
				</p>
				<Link to="/aisettings">
					<Button variant="subtle">
						<ArrowLeftIcon />
						<span>Back to providers</span>
					</Button>
				</Link>
			</div>
		);
	}

	const provider = providerQuery.data;
	if (!provider) {
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
				<PageHeader
					className="pt-6 pb-0"
					actions={
						<Button
							type="button"
							variant="destructive"
							disabled={updateMutation.isPending || deleteMutation.isPending}
							onClick={() => {
								setDeleteDialogOpen(true);
							}}
						>
							<TrashIcon />
							<span>Delete provider</span>
						</Button>
					}
				>
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
						bedrockSavedAccessCredentials={hasBedrockStoredCredentials(
							provider,
						)}
						initialValues={aiProviderToFormValues(provider)}
						isLoading={updateMutation.isPending}
						submitError={updateMutation.error}
						onSubmit={(values) => {
							updateMutation.mutate(
								providerFormValuesToUpdate(values, provider),
								{
									onSuccess: () => {
										toast.success(`Provider "${provider.name}" updated.`);
									},
									onError: (error) => {
										toast.error(
											getErrorMessage(
												error,
												`Failed to update provider "${provider.name}".`,
											),
										);
									},
								},
							);
						}}
					/>
				</div>
				<DeleteDialog
					key={provider.name}
					isOpen={deleteDialogOpen}
					title="Delete provider"
					entity="provider"
					name={provider.name}
					confirmLoading={deleteMutation.isPending}
					onCancel={() => {
						setDeleteDialogOpen(false);
					}}
					onConfirm={() => {
						deleteMutation.mutate(undefined, {
							onSuccess: () => {
								toast.success(`Provider "${provider.name}" deleted.`);
								setDeleteDialogOpen(false);
								void navigate("/aisettings", { replace: true });
							},
							onError: (error) => {
								toast.error(
									getErrorMessage(
										error,
										`Failed to delete provider "${provider.name}".`,
									),
								);
							},
						});
					}}
				/>
			</div>
		</>
	);
};

export default UpdateProviderPageView;
