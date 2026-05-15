import type { QueryClient } from "react-query";
import { API } from "#/api/api";
import type {
	AIProvider,
	AIProviderKey,
	CreateAIProviderRequest,
	UpdateAIProviderRequest,
} from "#/api/typesGenerated";

const aiProvidersListKey = ["ai", "providers"] as const;

const aiProviderKeyFor = (idOrName: string) =>
	[...aiProvidersListKey, idOrName] as const;

const aiProviderKeysListKey = (idOrName: string) =>
	[...aiProviderKeyFor(idOrName), "keys"] as const;

export const aiProvidersList = () => ({
	queryKey: aiProvidersListKey,
	queryFn: (): Promise<AIProvider[]> => API.getAIProviders(),
});

export const aiProvider = (idOrName: string) => ({
	queryKey: aiProviderKeyFor(idOrName),
	queryFn: (): Promise<AIProvider> => API.getAIProvider(idOrName),
});

export const aiProviderKeys = (idOrName: string) => ({
	queryKey: aiProviderKeysListKey(idOrName),
	queryFn: (): Promise<AIProviderKey[]> => API.getAIProviderKeys(idOrName),
});

/**
 * Input for the compound create-with-key mutation. The optional `apiKey` is
 * sent as a second `POST /providers/{id}/keys` call after the provider is
 * created. If that key POST fails the provider is rolled back via DELETE so
 * the caller sees a single error.
 */
type CreateAIProviderWithKeyInput = {
	provider: CreateAIProviderRequest;
	apiKey?: string;
};

export const createAIProviderMutation = (queryClient: QueryClient) => ({
	mutationFn: async ({
		provider,
		apiKey,
	}: CreateAIProviderWithKeyInput): Promise<AIProvider> => {
		const created = await API.createAIProvider(provider);
		if (apiKey && apiKey.trim() !== "") {
			try {
				await API.createAIProviderKey(created.id, { api_key: apiKey.trim() });
			} catch (keyErr) {
				// Roll back the provider so the caller can surface a single error.
				// Best-effort: if the rollback delete itself fails we still surface
				// the original key-POST failure.
				try {
					await API.deleteAIProvider(created.id);
				} catch {
					// ignore
				}
				throw keyErr;
			}
		}
		return created;
	},
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
	},
});

/**
 * Input for the compound update-with-key mutation. The optional `apiKey` is
 * POSTed to the keys sub-resource after the provider PATCH succeeds. If a
 * `previousKeyId` is supplied, it is deleted after the new key is live so
 * there's never a window with zero keys on file.
 *
 * Order is PATCH → POST → DELETE: provider PATCH is the most likely failure
 * (validation), and POST-before-DELETE preserves the no-zero-keys window. If
 * the DELETE step fails after the new key is created, we treat the rotation
 * as a success but warn via the console so the admin can revoke the stale
 * key manually.
 */
type UpdateAIProviderWithKeyInput = {
	provider: UpdateAIProviderRequest;
	apiKey?: string;
	previousKeyId?: string;
};

export const updateAIProviderMutation = (
	queryClient: QueryClient,
	idOrName: string,
) => ({
	mutationFn: async ({
		provider,
		apiKey,
		previousKeyId,
	}: UpdateAIProviderWithKeyInput): Promise<AIProvider> => {
		const updated = await API.updateAIProvider(idOrName, provider);
		const trimmed = apiKey?.trim() ?? "";
		if (trimmed !== "") {
			await API.createAIProviderKey(idOrName, { api_key: trimmed });
			if (previousKeyId) {
				try {
					await API.deleteAIProviderKey(idOrName, previousKeyId);
				} catch (revokeErr) {
					// The new key is live; the old one is still on the server. We
					// don't fail the whole rotation because of this, but the admin
					// should know so they can clean it up manually.
					// eslint-disable-next-line no-console -- soft warning, not a hard failure
					console.warn(
						"Failed to revoke previous AI provider key after rotation:",
						revokeErr,
					);
				}
			}
		}
		return updated;
	},
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
		await queryClient.invalidateQueries({
			queryKey: aiProviderKeyFor(idOrName),
		});
		await queryClient.invalidateQueries({
			queryKey: aiProviderKeysListKey(idOrName),
		});
	},
});

export const deleteAIProviderMutation = (
	queryClient: QueryClient,
	idOrName: string,
) => ({
	mutationFn: () => API.deleteAIProvider(idOrName),
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
		queryClient.removeQueries({ queryKey: aiProviderKeyFor(idOrName) });
		queryClient.removeQueries({ queryKey: aiProviderKeysListKey(idOrName) });
	},
});
