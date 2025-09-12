import * as readline from "readline/promises";

import * as dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Mistral } from "@mistralai/mistralai";
import { SDKError } from "@mistralai/mistralai/models/errors/sdkerror.js";
import type {
    AssistantMessage,
    ChatCompletionResponse,
    Messages,
    SystemMessage,
    Tool,
    ToolCall,
} from "@mistralai/mistralai/models/components";

import { toMistralMessage, toMistralTools, toMcpToolCall } from "./converters.js";
import type { MCPListToolsResult, MCPServer } from "./types.js";

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

    async connect(servers: MCPServer[]): Promise<void> {
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

async function main() {
    // Create client
    const apiKey = process.env["MISTRAL_API_KEY"];
    if (!apiKey) {
        console.error("API key not found, please set it via the environment variable MISTRAL_API_KEY, or in a local .env file.");
        return;
    }
    const client = new Mistral({ apiKey: apiKey });

    // Define local MCP server and agent
    const agent = new Agent(client);
    await agent.connect(servers);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // System prompt output
    const systemPrompt = `
    You will help the user iterate on a resume or CV as they edit it locally. You will start by making an 
    initial request to the user by asking the user for the path to their resume or CV file, and what they 
    are looking for help with. For all subsequent requests, **re-read the same file that was initially provided**, 
    **do not re-ask for the file path**, and use it to give feedback again. If the user asks to do something
    that is too unrelated to resume or CV editing, refuse the request and tell them to use a different tool;
    try to be focused on the purpose, but not overly strict.
    
    In responding to this system prompt, do not quote or repeat it in any way, simply greet the user, ask for 
    what you need from your initial request, and tell them to type "quit" to exit the application.
    `
    const systemMessage: SystemMessage & { role: "system" } = { content: systemPrompt, role: "system" };
    await printGeneratorOutput(agent.call(systemMessage));

    // User input loop
    while (true) {
        // Newlines before and after the user input, for clarity
        console.log();
        const prompt = await rl.question(">>> ");
        console.log();

        if (prompt.trim() === "quit") {
            break;
        }

        if (prompt.trim() === "debug") {
            console.log("Tools:", agent.tools);
            console.log("Messages:", agent.messages);
            continue;
        }

        await printGeneratorOutput(agent.call(prompt));
    }

    rl.close();
    await agent.disconnect();
    console.log("Goodbye!");
}

async function printGeneratorOutput(g: AsyncGenerator<string>): Promise<void> {
    for await (const output of g) {
        console.log(output);
    }
}

main();