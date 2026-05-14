import { ChevronRightIcon } from "lucide-react";
import type { AIProvider } from "#/api/api";
import { Avatar } from "#/components/Avatar/Avatar";
import { AvatarData } from "#/components/Avatar/AvatarData";
import { TableCell, TableRow } from "#/components/Table/Table";
import { ProviderIcon } from "./ProviderIcon";

type ProviderRowProps = {
	provider: AIProvider;
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
						provider.api_keys?.length || provider.api_key?.length
							? `${provider.api_keys?.length ?? provider.api_key?.length ?? 0} models`
							: "No models"
					}
					avatar={
						<Avatar className="flex items-center justify-center">
							<ProviderIcon provider={provider.type} />
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
