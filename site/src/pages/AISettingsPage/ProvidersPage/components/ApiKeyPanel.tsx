import { useFormik } from "formik";
import { KeyRoundIcon, TrashIcon } from "lucide-react";
import { type FC, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";
import * as Yup from "yup";
import { getErrorMessage } from "#/api/errors";
import {
	aiProviderKeys,
	createAIProviderKeyMutation,
	deleteAIProviderKeyMutation,
} from "#/api/queries/aiProviders";
import type { AIProvider, AIProviderKey } from "#/api/typesGenerated";
import { ErrorAlert } from "#/components/Alert/ErrorAlert";
import { Button } from "#/components/Button/Button";
import { ConfirmDialog } from "#/components/Dialogs/ConfirmDialog/ConfirmDialog";
import { FormField } from "#/components/FormField/FormField";
import { Spinner } from "#/components/Spinner/Spinner";
import { getFormHelpers } from "#/utils/formUtils";

type ApiKeyPanelProps = {
	provider: AIProvider;
};

type AddKeyFormValues = {
	apiKey: string;
};

const addKeySchema = Yup.object({
	apiKey: Yup.string().trim().required("API key is required"),
});

const formatDate = (iso: string): string => {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
};

/**
 * The wire API supports many keys per provider, but we sort by created_at
 * descending and treat the newest as "current" so the single-key UI reads
 * naturally even after a rotation.
 */
const pickCurrentKey = (
	keys: readonly AIProviderKey[],
): AIProviderKey | null => {
	if (keys.length === 0) return null;
	return keys.reduce((latest, key) =>
		Date.parse(key.created_at) > Date.parse(latest.created_at) ? key : latest,
	);
};

/**
 * Single-key management for OpenAI / Anthropic providers. Rotating posts a
 * new key, then deletes the previous one (post-then-revoke so there's never
 * a window with zero keys). Bedrock providers do not use this endpoint, so
 * callers should not render the panel for them.
 */
export const ApiKeyPanel: FC<ApiKeyPanelProps> = ({ provider }) => {
	const queryClient = useQueryClient();
	const keysQuery = useQuery(aiProviderKeys(provider.id));
	const createMutation = useMutation(
		createAIProviderKeyMutation(queryClient, provider.id),
	);
	const deleteMutation = useMutation(
		deleteAIProviderKeyMutation(queryClient, provider.id),
	);

	const [deletePromptOpen, setDeletePromptOpen] = useState(false);
	const [isRotating, setIsRotating] = useState(false);

	const keys = keysQuery.data ?? [];
	const currentKey = pickCurrentKey(keys);
	const extraKeyCount = currentKey ? Math.max(0, keys.length - 1) : keys.length;
	const showAddForm = !currentKey;
	const isMutating = createMutation.isPending || deleteMutation.isPending;

	const form = useFormik<AddKeyFormValues>({
		initialValues: { apiKey: "" },
		validationSchema: addKeySchema,
		onSubmit: async ({ apiKey }) => {
			const trimmed = apiKey.trim();
			if (!trimmed) return;

			const previous = currentKey;
			try {
				await createMutation.mutateAsync({ api_key: trimmed });
			} catch (err) {
				toast.error(
					getErrorMessage(
						err,
						previous ? "Failed to rotate API key." : "Failed to add API key.",
					),
				);
				return;
			}

			if (previous) {
				try {
					await deleteMutation.mutateAsync(previous.id);
				} catch (revokeErr) {
					// The new key is live, but the old one is still on the
					// server. Surface this as a soft warning so the admin
					// knows to revoke it manually rather than treating the
					// whole flow as failed.
					toast.warning(
						getErrorMessage(
							revokeErr,
							"API key was added, but revoking the previous key failed. Remove it manually.",
						),
					);
				}
			}

			toast.success(previous ? "API key rotated." : "API key added.");
			form.resetForm();
			setIsRotating(false);
		},
	});
	const getFieldHelpers = getFormHelpers(form, createMutation.error);

	const onRemoveConfirmed = async () => {
		if (!currentKey) {
			setDeletePromptOpen(false);
			return;
		}
		try {
			await deleteMutation.mutateAsync(currentKey.id);
			toast.success("API key removed.");
			setDeletePromptOpen(false);
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to remove API key."));
		}
	};

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-solid p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h3 className="m-0 text-base font-medium">API key</h3>
					<p className="m-0 text-xs text-content-secondary">
						Coder uses this key to authenticate requests proxied to{" "}
						{provider.display_name}. Rotating replaces the existing key in a
						single step.
					</p>
				</div>
				<KeyRoundIcon
					className="size-icon-md shrink-0 text-content-secondary"
					aria-hidden="true"
				/>
			</div>

			{keysQuery.isError && <ErrorAlert error={keysQuery.error} />}

			{currentKey && !isRotating && (
				<div className="flex flex-col gap-3 rounded-md border border-solid border-border-secondary p-4">
					<div className="flex flex-col gap-1">
						<p className="m-0 text-sm font-medium">API key set</p>
						<p className="m-0 text-xs text-content-secondary">
							Added {formatDate(currentKey.created_at)}.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setIsRotating(true);
							}}
							disabled={isMutating}
						>
							Rotate API key
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => {
								setDeletePromptOpen(true);
							}}
							disabled={isMutating}
						>
							<TrashIcon />
							<span>Remove API key</span>
						</Button>
					</div>
				</div>
			)}

			{extraKeyCount > 0 && (
				<p className="m-0 text-xs text-content-warning">
					{extraKeyCount === 1
						? "1 additional API key exists on the server."
						: `${extraKeyCount} additional API keys exist on the server.`}{" "}
					Remove it and re-add a single key to clean up.
				</p>
			)}

			{(showAddForm || isRotating) && (
				<form
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						void form.submitForm();
					}}
				>
					<FormField
						field={getFieldHelpers("apiKey")}
						label={isRotating ? "New API key" : "API key"}
						type="password"
						description={
							isRotating
								? "Submitting replaces the existing key in a single step."
								: undefined
						}
						className="w-full"
						autoComplete="new-password"
						disabled={isMutating}
					/>
					<div className="flex justify-end gap-2">
						{isRotating && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsRotating(false);
									form.resetForm();
								}}
								disabled={isMutating}
							>
								Cancel
							</Button>
						)}
						<Button type="submit" disabled={isMutating}>
							<Spinner loading={createMutation.isPending} />
							{isRotating ? "Rotate API key" : "Add API key"}
						</Button>
					</div>
				</form>
			)}

			<ConfirmDialog
				type="delete"
				open={deletePromptOpen}
				onClose={() => setDeletePromptOpen(false)}
				onConfirm={() => {
					void onRemoveConfirmed();
				}}
				confirmLoading={deleteMutation.isPending}
				title="Remove API key"
				description={
					<>
						This removes the API key from{" "}
						<strong>{provider.display_name}</strong>. Coder will no longer be
						able to authenticate requests until a new key is added.
					</>
				}
				confirmText="Remove API key"
			/>
		</div>
	);
};
