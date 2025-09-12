import * as readline from "readline/promises";

import * as dotenv from "dotenv";
import { Mistral } from "@mistralai/mistralai";
import type { SystemMessage } from "@mistralai/mistralai/models/components";

import { Agent } from "./agent.js";
import type { MCPServer } from "./types.js";

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