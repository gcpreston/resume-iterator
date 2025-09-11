import { Mistral } from "@mistralai/mistralai";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const apiKey = process.env["MISTRAL_API_KEY"];

    if (!apiKey) {
        console.error("API key not found, please set it via the environment variable MISTRAL_API_KEY.");
        return;
    }

    const client = new Mistral({ apiKey: apiKey });

    const result = await client.chat.stream({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: "What is the best French cheese?" }],
    });

    for await (const chunk of result) {
        const streamText = chunk.data.choices[0]?.delta.content;
        if (typeof streamText === "string") {
            process.stdout.write(streamText);
        }
    }
}

main();