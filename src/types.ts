export type MCPServer = {
    name: string;
    command: string;
    args: string[];
};

type MCPTool = {
    name: string;
    description?: string;
    inputSchema: {
        type: "object";
        properties?: Record<string, unknown>;
    };
};

export type MCPListToolsResult = {
    tools: MCPTool[];
    nextCursor?: string;
};

export type MistralTool = {
    type?: "function";
    function: {
        name: string;
        description?: string;
        strict?: boolean;
        parameters: Record<string, unknown>;
    };
};

export type MistralToolCall = {
    id?: string;
    type?: "function" | string;
    function: {
        name: string;
        arguments: Record<string, unknown> | string;
    };
    index?: number;
};

export type MCPCallToolRequest = {
    name: string;
    arguments?: Record<string, unknown>;
};

type MCPTextContent = {
    type: "text";
    text: string;
};

type MCPImageContent = {
    type: "image";
    data: string;
    mimeType: string;
};

type MCPResourceContent = {
    type: "resource";
    resource:
    | {
        text: string;
        uri: string;
        mimeType?: string;
    }
    | { blob: string; uri: string; mimeType?: string };
};

type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export type MCPCallToolResult =
    | {
        content: MCPContent[];
        isError?: boolean;
    }
    | { toolResult?: unknown };

type MistralImageURLChunk = {
    type: "image_url";
    imageUrl:
    | string
    | {
        url: string;
        detail?: string | null;
    };
};

type MistralTextChunk = {
    type: "text";
    text: string;
};

type MistralReferenceChunk = {
    type: "reference";
    referenceIds: number[];
};

type MistralContentChunk =
    | MistralTextChunk
    | MistralImageURLChunk
    | MistralReferenceChunk;

export type MistralToolMessage = {
    role: "tool";
    content: string | MistralContentChunk[] | null;
    toolCallId?: string | null;
    name?: string | null;
};