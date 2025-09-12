import type { ToolCall } from "@mistralai/mistralai/models/components";
import type {
    MCPCallToolRequest,
    MCPListToolsResult,
    MCPCallToolResult,
    MistralTool,
    MistralToolMessage,
} from "./types";

export function toMistralTools(
    listToolResult: MCPListToolsResult
): MistralTool[] {
    return listToolResult.tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }));
}

export function toMcpToolCall(toolCall: ToolCall): MCPCallToolRequest {
    const call = toolCall.function;
    const toolCallArguments =
        typeof call.arguments === "string"
            ? (JSON.parse(call.arguments) as Record<string, unknown>)
            : call.arguments;

    return {
        name: call.name,
        arguments: toolCallArguments,
    };
}

export function toMistralMessage(
    toolCallId: string,
    callToolResult: MCPCallToolResult
): MistralToolMessage {
    let content: MistralToolMessage["content"];

    if ("content" in callToolResult && callToolResult.content) {
        // Convert all content to text for Mistral
        const textContent = callToolResult.content.map((item) => {
            if (item.type === "text" && "text" in item) {
                return String(item.text);
            } else {
                // For non-text content, serialize to JSON string
                return JSON.stringify(item);
            }
        }).join("\n");

        content = textContent;
    } else if ("toolResult" in callToolResult && callToolResult.toolResult) {
        // Handle case where content is not provided and toolResult is used instead
        content = JSON.stringify(callToolResult.toolResult);
    } else {
        throw new Error("No tool result found");
    }

    return {
        content: content,
        toolCallId,
        role: "tool",
    };
}