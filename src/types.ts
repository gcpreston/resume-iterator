export type MCPServer = {
    name: string;
    command: string;
    args: string[];
};

type MCPTool = {
    name: string;
    description?: string | undefined;
    inputSchema: {
        type: "object";
        properties?: Record<string, unknown> | undefined;
    };
};

export type MCPListToolsResult = {
    tools: MCPTool[];
    nextCursor?: string | undefined;
};

export type MistralTool = {
    type?: "function";
    function: {
        name: string;
        description?: string | undefined;
        strict?: boolean | undefined;
        parameters: Record<string, unknown>;
    };
};

export type MCPCallToolRequest = {
    name: string;
    arguments?: Record<string, unknown> | undefined;
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

type MCPAudioContent = {
    type: "audio";
    data: string;
    mimeType: string;
};

type MCPResourceContent = {
    type: "resource";
    resource:
    | {
        text: string;
        uri: string;
        mimeType?: string | undefined;
    }
    | { blob: string; uri: string; mimeType?: string | undefined };
};

// Make content types more flexible to handle actual MCP SDK responses
type MCPContent = 
    | MCPTextContent 
    | MCPImageContent 
    | MCPAudioContent 
    | MCPResourceContent
    | { type: string; [key: string]: unknown }; // Catch-all for other content types

export type MCPCallToolResult =
    | {
        content: MCPContent[];
        isError?: boolean | undefined;
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
    toolCallId?: string | null | undefined;
    name?: string | null | undefined;
};