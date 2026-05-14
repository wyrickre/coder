import type { QueryClient } from "react-query";
import {
	type AIProvider,
	API,
	type CreateAIProviderRequest,
	type UpdateAIProviderRequest,
} from "#/api/api";

export const aiProvidersListKey = ["ai", "providers"] as const;

export const aiProviderKey = (providerName: string) =>
	[...aiProvidersListKey, providerName] as const;

export const aiProvidersList = () => ({
	queryKey: aiProvidersListKey,
	queryFn: (): Promise<AIProvider[]> => API.getProviders(),
});

export const aiProvider = (providerName: string) => ({
	queryKey: aiProviderKey(providerName),
	queryFn: (): Promise<AIProvider> => API.getProvider(providerName),
});

export const createAIProviderMutation = (queryClient: QueryClient) => ({
	mutationFn: (req: CreateAIProviderRequest) => API.createProvider(req),
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
	},
});

export const updateAIProviderMutation = (
	queryClient: QueryClient,
	providerName: string,
) => ({
	mutationFn: (req: UpdateAIProviderRequest) =>
		API.updateProvider(providerName, req),
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: aiProvidersListKey });
	},
});
