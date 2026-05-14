import type { QueryClient } from "react-query";
import { API } from "#/api/api";
import type {
	AIProvider,
	CreateAIProviderRequest,
	UpdateAIProviderRequest,
} from "#/api/typesGenerated";

const aiProvidersListKey = ["ai", "providers"] as const;

const aiProviderKeyFor = (idOrName: string) =>
	[...aiProvidersListKey, idOrName] as const;

export const aiProvidersList = () => ({
	queryKey: aiProvidersListKey,
	queryFn: (): Promise<AIProvider[]> => API.getAIProviders(),
});

export const aiProvider = (idOrName: string) => ({
	queryKey: aiProviderKeyFor(idOrName),
	queryFn: (): Promise<AIProvider> => API.getAIProvider(idOrName),
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

export const updateAIProviderMutation = (
	queryClient: QueryClient,
	idOrName: string,
) => ({
	mutationFn: (req: UpdateAIProviderRequest) =>
		API.updateAIProvider(idOrName, req),
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
		await queryClient.invalidateQueries({
			queryKey: aiProviderKeyFor(idOrName),
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
	},
});
