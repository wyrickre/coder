import { isAxiosError } from "axios";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
	Link,
	Navigate,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "#/api/errors";
import {
	aiProvider,
	aiProviderKeys,
	deleteAIProviderMutation,
	updateAIProviderMutation,
} from "#/api/queries/aiProviders";
import type { AIProviderKey, Organization } from "#/api/typesGenerated";
import { Avatar } from "#/components/Avatar/Avatar";
import { Button } from "#/components/Button/Button";
import { DeleteDialog } from "#/components/Dialogs/DeleteDialog/DeleteDialog";
import { Loader } from "#/components/Loader/Loader";
import {
	PageHeader,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import { OrganizationPicker } from "../components/OrganizationPicker";
import { ProviderForm } from "../components/ProviderForm";
import { getProviderIcon } from "../components/ProviderIcon";
import {
	aiProviderToFormValues,
	hasBedrockStoredCredentials,
	isBedrockProvider,
	providerFormValuesToUpdate,
} from "../components/providerFormApiMap";

const ORGANIZATION_QUERY_PARAM = "organizationId";

interface UpdateProviderPageViewProps {
	organizations: Organization[] | undefined;
}

/**
 * The wire API supports many keys per provider, but we sort by created_at
 * descending and treat the newest as "current" so the single-key UI reads
 * naturally even after a rotation.
 */
const pickCurrentKey = (
	keys: readonly AIProviderKey[],
): AIProviderKey | undefined => {
	if (keys.length === 0) return undefined;
	return keys.reduce((latest, key) =>
		Date.parse(key.created_at) > Date.parse(latest.created_at) ? key : latest,
	);
};

const UpdateProviderPageView: React.FC<UpdateProviderPageViewProps> = ({
	organizations,
}) => {
	const { providerId } = useParams<{ providerId: string }>();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	// TODO: AI providers are not yet organization-scoped on the wire, so the
	// org id is round-tripped in the URL only. The picker below is rendered
	// as disabled to surface which org context the user arrived from without
	// implying they can reassign it.
	const selectedOrganizationId = searchParams.get(ORGANIZATION_QUERY_PARAM);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const providerQuery = useQuery({
		...aiProvider(providerId ?? ""),
		enabled: Boolean(providerId),
	});

	const provider = providerQuery.data;
	const providerIsOpenAiAnthropic =
		provider !== undefined && !isBedrockProvider(provider);

	// Only openai/anthropic providers use the /keys sub-resource. Bedrock
	// authenticates via `settings` and the server rejects key POSTs for it,
	// so we skip the query entirely.
	const keysQuery = useQuery({
		...aiProviderKeys(providerId ?? ""),
		enabled: Boolean(provider) && providerIsOpenAiAnthropic,
	});

	const updateMutation = useMutation(
		updateAIProviderMutation(queryClient, providerId ?? ""),
	);

	const deleteMutation = useMutation(
		deleteAIProviderMutation(queryClient, providerId ?? ""),
	);

	const backHref = selectedOrganizationId
		? `/ai/settings?${ORGANIZATION_QUERY_PARAM}=${encodeURIComponent(selectedOrganizationId)}`
		: "/ai/settings";

	if (!providerId) {
		return <Navigate to={backHref} replace />;
	}

	if (providerQuery.isLoading) {
		return <Loader fullscreen />;
	}

	if (providerQuery.isError) {
		const status = isAxiosError(providerQuery.error)
			? providerQuery.error.response?.status
			: undefined;
		if (status === 404) {
			return <Navigate to={backHref} replace />;
		}
		return (
			<div className="pt-4 px-6 flex flex-col gap-4">
				<p className="text-content-secondary">
					{getErrorMessage(providerQuery.error, "Failed to load provider.")}
				</p>
				<Link to={backHref}>
					<Button variant="subtle">
						<ArrowLeftIcon />
						<span>Back to providers</span>
					</Button>
				</Link>
			</div>
		);
	}

	if (!provider) {
		return <Navigate to={backHref} replace />;
	}

	// The keys query only fires for openai/anthropic, and `ProviderForm` seeds
	// its initial values once at mount. If we render the form before the keys
	// query resolves, the saved-credential mask never gets seeded into the
	// `apiKey` field. Block on the keys query the same way we block on the
	// provider query.
	if (providerIsOpenAiAnthropic && keysQuery.isLoading) {
		return <Loader fullscreen />;
	}

	const currentKey = providerIsOpenAiAnthropic
		? pickCurrentKey(keysQuery.data ?? [])
		: undefined;
	const openAiAnthropicSavedApiKey =
		providerIsOpenAiAnthropic && currentKey !== undefined;

	return (
		<>
			<div className="pt-4 px-6">
				<Link to={backHref}>
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
						<>
							<OrganizationPicker
								organizations={organizations}
								value={selectedOrganizationId ?? ""}
								disabled
								ariaLabel="Provider organization"
							/>
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
						</>
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
						// Use the provider identity as the key so navigating to a
						// different provider remounts the form with fresh values,
						// while background refetches of the same provider don't
						// reset in-progress edits.
						key={provider.id}
						bedrockSavedAccessCredentials={hasBedrockStoredCredentials(
							provider,
						)}
						openAiAnthropicSavedApiKey={openAiAnthropicSavedApiKey}
						initialValues={aiProviderToFormValues(provider)}
						isLoading={updateMutation.isPending}
						submitError={updateMutation.error}
						onSubmit={(values) => {
							const { request, apiKey } = providerFormValuesToUpdate(
								values,
								provider,
							);
							updateMutation.mutate(
								{
									provider: request,
									apiKey,
									// Only rotate the previous key when the user supplied a
									// new one. An untouched mask sanitizes to undefined, so
									// the chained POST/DELETE is skipped entirely.
									previousKeyId: apiKey ? currentKey?.id : undefined,
								},
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
								void navigate(backHref, { replace: true });
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
