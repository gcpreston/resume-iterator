import * as dotenv from "dotenv";
import { Mistral } from "@mistralai/mistralai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
    AssistantMessage,
    ChatCompletionResponse,
    Messages,
    Tool,
} from "@mistralai/mistralai/models/components";
import { toMistralMessage, toMistralTools, toMcpToolCall } from "./converters.js";
import type { MCPListToolsResult, MCPServer } from "./types.js";

// https://keesheuperman.com/mcp-with-mistral/
dotenv.config();

const servers: MCPServer[] = [
    {
        name: "filesystem",
        command: "npx",
        args: [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "./"
        ]
    }
];

class Agent {
    ai: Mistral;
    clients: Client[] = [];
    tools: Tool[] = [];
    toolToClientMap: Record<string, Client> = {};
    messages: Messages[] = [];

    constructor(ai: Mistral) {
        this.ai = ai;
    }

    async connect(servers: MCPServer[]) {
        for (const server of servers) {
            const transport = new StdioClientTransport(server);
            const client = new Client({
                name: server.name + "-client",
                version: "1.0.0",
            });
            await client.connect(transport);
            this.clients.push(client);
            console.log(`Connected to MCP server ${server.name}`);

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

    async disconnect() {
        for (const client of this.clients) {
            await client.close();
        }
    }

    async call(message: string | Messages) {
        if (typeof message === "string") {
            this.messages.push({
                role: "user",
                content: message,
            });
        } else {
            this.messages.push(message);
        }

        const response = await this.ai.chat.complete({
            model: "mistral-small-latest",
            messages: this.messages,
            tools: this.tools,
        });

        if (response.choices?.length) {
            await this.handleResponse(response);
        }
    }

    async handleResponse(response: ChatCompletionResponse) {
        const firstChoice = response.choices[0];
        if (!firstChoice) {
            throw new Error("No response choices found");
        }

        const { message: assistantMessage, finishReason } = firstChoice;

        if (
            assistantMessage.content &&
            typeof assistantMessage.content === "string"
        ) {
            console.log(`[Mistral]: ${assistantMessage.content}`);
        }

        if (assistantMessage.role === "assistant") {
            this.messages.push(
                assistantMessage as AssistantMessage & { role: "assistant" }
            );
        }

        if (finishReason === "tool_calls") {
            if (!assistantMessage.toolCalls) {
                throw new Error("No tool calls found in response");
            }

            for (const toolCall of assistantMessage.toolCalls) {
                if (!toolCall.id) {
                    throw new Error("Tool call ID not found");
                }

                const mcpToolCall = toMcpToolCall(toolCall);
                const client = this.toolToClientMap[toolCall.function.name];
                console.log(`Using tool: ${toolCall.function.name} ...`);

                if (!client) throw new Error(`No client found for tool ${toolCall.function.name}`)

                const toolResult = await client.callTool(mcpToolCall);
                const message = toMistralMessage(toolCall.id, toolResult);

                await this.call(message);
            }
        }
    }
}

async function main() {
    // Create client
    const apiKey = process.env["MISTRAL_API_KEY"];
    if (!apiKey) {
        console.error("API key not found, please set it via the environment variable MISTRAL_API_KEY.");
        return;
    }
    const client = new Mistral({ apiKey: apiKey });

    // Define local MCP server and agent
    // const fs_agent = await client.beta.agents.create({
    //     model: "mistral-small-latest",
    //     name: "file reader"
    // });
    const agent = new Agent(client);
    await agent.connect(servers);
    await agent.call(
        "Please read the file read_me.txt and tell me what you find inside."
    );
    await agent.disconnect();

    // ----
    // const result = await client.chat.stream({
    //     model: "mistral-small-latest",
    //     messages: [{ role: "user", content: "What is the best French cheese?" }],
    // });

    // for await (const chunk of result) {
    //     const streamText = chunk.data.choices[0]?.delta.content;
    //     if (typeof streamText === "string") {
    //         process.stdout.write(streamText);
    //     }
    // }
}

main();