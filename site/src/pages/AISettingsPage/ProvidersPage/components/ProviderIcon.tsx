import { ExternalImage } from "#/components/ExternalImage/ExternalImage";

type ProviderIconProps = {
	provider: string;
};

const ProviderIcon: React.FC<ProviderIconProps> = ({ provider }) => {
	switch (provider) {
		case "openai":
			return (
				<ExternalImage
					src="/icon/openai.svg"
					alt="OpenAI"
					className="size-icon-sm"
				/>
			);
		case "anthropic":
			return (
				<ExternalImage
					src="/icon/anthropic.svg"
					alt="Anthropic"
					className="size-icon-sm"
				/>
			);
		case "bedrock":
			return (
				<ExternalImage
					src="/icon/aws.svg"
					alt="AWS Bedrock"
					className="size-icon-sm"
				/>
			);
		default:
			return null;
	}
};

export default ProviderIcon;
