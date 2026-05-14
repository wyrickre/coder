import { ExternalImage } from "#/components/ExternalImage/ExternalImage";

type ProviderIconProps = {
	provider: string;
};

export const getProviderIcon = (provider: string) => {
	switch (provider) {
		case "openai":
			return "/icon/openai.svg";
		case "anthropic":
			return "/icon/anthropic.svg";
		case "bedrock":
			return "/icon/aws.svg";
	}
};

export const getProviderName = (provider: string) => {
	switch (provider) {
		case "openai":
			return "OpenAI";
		case "anthropic":
			return "Anthropic";
		case "bedrock":
			return "AWS Bedrock";
	}
};

export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider }) => {
	return (
		<ExternalImage
			src={getProviderIcon(provider)}
			alt={getProviderName(provider)}
			className="size-icon-sm"
		/>
	);
};
