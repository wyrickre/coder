import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { Avatar } from "#/components/Avatar/Avatar";
import { AvatarData } from "#/components/Avatar/AvatarData";
import { Button } from "#/components/Button/Button";
import { ExternalImage } from "#/components/ExternalImage/ExternalImage";
import { Margins } from "#/components/Margins/Margins";
import {
	PageHeader,
	PageHeaderSubtitle,
	PageHeaderTitle,
} from "#/components/PageHeader/PageHeader";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/Table/Table";

const MOCK_READ_LIST_PROVIDERS = [
	{
		type: "openai",
		name: "openai",
		display_name: "OpenAI",
		base_url: "https://api.openai.com",
		api_keys: ["abcd....wxyz"], // masked API key(s)
		settings: null,
		enabled: false,
		created_at: "...UTC",
		updated_at: "...UTC",
	},
	{
		type: "anthropic",
		name: "bedrock",
		display_name: "Bedrock",
		base_url: "https://bedrock-runtime.us-east-2.amazonaws.com",
		api_key: [], // empty set for bedrock
		settings: {
			_type: "bedrock", // identifies JSON payload type
			_version: "1", // identifies JSON payload version
			access_keys: ["abcd....wxyz"], // masked API key(s)
			access_key_secrets: ["abcd....wxyz"], // masked API key secret(s)
			model: "anthropic.claude-opus-4-7",
			small_fast_model: "anthropic.claude-haiku-4-5",
		},
		enabled: true,
		created_at: "...UTC",
		updated_at: "...UTC",
	},
];

const ProvidersPageView: React.FC = () => {
	return (
		<Margins>
			<PageHeader
				actions={
					<Button>
						<PlusIcon />
						<span>Add Provider</span>
					</Button>
				}
			>
				<PageHeaderTitle>Providers</PageHeaderTitle>
				<PageHeaderSubtitle>
					Connect third-party LLM services like OpenAI, Anthropic, or Google.
					Each provider supplies models that users can select for their
					conversations.
				</PageHeaderSubtitle>
			</PageHeader>
			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Base URL</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{MOCK_READ_LIST_PROVIDERS.map((provider) => (
						<TableRow key={provider.name}>
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
											<ExternalImage
												src="/icon/openai.svg"
												className="size-icon-sm"
											/>
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
					))}
				</TableBody>
			</Table>
		</Margins>
	);
};

export default ProvidersPageView;
