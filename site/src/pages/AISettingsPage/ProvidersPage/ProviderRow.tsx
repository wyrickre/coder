import { ChevronRightIcon } from "lucide-react";
import { Avatar } from "#/components/Avatar/Avatar";
import { AvatarData } from "#/components/Avatar/AvatarData";
import { ExternalImage } from "#/components/ExternalImage/ExternalImage";
import { TableCell, TableRow } from "#/components/Table/Table";
import type { MOCK_READ_LIST_PROVIDERS } from "#/pages/AISettingsPage/mock";

type ProviderRowProps = {
	provider: (typeof MOCK_READ_LIST_PROVIDERS)[number];
	onClick?: () => void;
};

export const ProviderRow: React.FC<ProviderRowProps> = ({
	provider,
	onClick,
}) => {
	return (
		<TableRow
			key={provider.name}
			hover
			className="cursor-pointer"
			onClick={() => onClick?.()}
		>
			<TableCell>
				<AvatarData
					title={provider.display_name}
					subtitle={
						// TODO: This is a placeholder for the number of models
						provider.api_keys
							? `${provider.api_keys?.length} models`
							: "No models"
					}
					avatar={
						<Avatar className="flex items-center justify-center">
							<ExternalImage src="/icon/openai.svg" className="size-icon-sm" />
						</Avatar>
					}
				/>
			</TableCell>
			<TableCell>
				<div className="flex justify-between">
					<span>{provider.base_url}</span>
					<ChevronRightIcon className="size-icon-sm" />
				</div>
			</TableCell>
		</TableRow>
	);
};
