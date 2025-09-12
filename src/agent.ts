import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Mistral } from "@mistralai/mistralai";
import { SDKError } from "@mistralai/mistralai/models/errors/sdkerror.js";
import type {
    AssistantMessage,
    ChatCompletionResponse,
    Messages,
    Tool,
    ToolCall,
} from "@mistralai/mistralai/models/components";

import { toMistralMessage, toMistralTools, toMcpToolCall } from "./converters.js";
import type { MCPListToolsResult, MCPServer } from "./types.js";

export class Agent {
    ai: Mistral;
    clients: Client[] = [];
    tools: Tool[] = [];
    toolToClientMap: Record<string, Client> = {};
    messages: Messages[] = [];

    constructor(ai: Mistral) {
        this.ai = ai;
    }

    async connect(servers: MCPServer[]): Promise<void> {
        for (const server of servers) {
            const transport = new StdioClientTransport(server);
            const client = new Client({
                name: server.name + "-client",
                version: "1.0.0",
            });
            await client.connect(transport);
            this.clients.push(client);

            // Store the tools and their corresponding clients in a map,
            // so we can call the right client when a tool is called later.
            const toolsList: MCPListToolsResult = await client.listTools();
            const toolsForMistral = toMistralTools(toolsList);
            this.tools.push(...toolsForMistral);
            for (const tool of toolsForMistral) {
                this.toolToClientMap[tool.function.name] = client;
            }
        }
    }

    async disconnect(): Promise<void> {
        for (const client of this.clients) {
            await client.close();
        }
    }

    async* call(message: string | Messages): AsyncGenerator<string> {
        if (typeof message === "string") {
            this.messages.push({ role: "user", content: message });
        } else {
            this.messages.push(message);
        }

        try {
            const response = await this.ai.chat.complete({
                model: "mistral-small-latest",
                messages: this.messages,
                tools: this.tools,
            });

            yield* this._handleResponse(response);
        } catch (err) {
            if (err instanceof SDKError) {
                yield `Error: ${err.message}`;
            } else {
                yield `Received unknown error: ${err}`;
            }
        }
    }

    async* _handleResponse(response: ChatCompletionResponse): AsyncGenerator<string> {
        const firstChoice = response.choices[0];
        if (!firstChoice) {
            throw new Error("No response choices found");
        }

        const { message: assistantMessage, finishReason } = firstChoice;

        // Output message, if relevant
        if (assistantMessage.content && typeof assistantMessage.content === "string") {
            yield `[Mistral]: ${assistantMessage.content}`;
        }

        // Add response message to chat history
        if (assistantMessage.role === "assistant") {
            this.messages.push(assistantMessage as AssistantMessage & { role: "assistant" });
        }

        // Call any tools and continue with Mistral flow, if relevant
        if (finishReason === "tool_calls") {
            if (!assistantMessage.toolCalls) {
                throw new Error("No tool calls found in response");
            }
            yield* this._handleToolCalls(assistantMessage.toolCalls);
        }
    }

    async* _handleToolCalls(toolCalls: ToolCall[]): AsyncGenerator<string> {
        for (const toolCall of toolCalls) {
            if (!toolCall.id) {
                throw new Error("Tool call ID not found");
            }

            const mcpToolCall = toMcpToolCall(toolCall);
            const client = this.toolToClientMap[toolCall.function.name];
            yield `Using tool: ${toolCall.function.name} ...`;

            if (!client) throw new Error(`No client found for tool ${toolCall.function.name}`)

            const toolResult = await client.callTool(mcpToolCall);
            const message = toMistralMessage(toolCall.id, toolResult);

            yield* this.call(message);
        }
    }
}