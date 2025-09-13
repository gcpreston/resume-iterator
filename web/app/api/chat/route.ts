import { NextRequest } from 'next/server';
import { Mistral } from "@mistralai/mistralai";
import type { SystemMessage } from "@mistralai/mistralai/models/components";
import { Agent } from '@/lib/agent';
import type { MCPServer } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, isFirstMessage } = await request.json();

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
    }

    const client = new Mistral({ apiKey });
    
    // Define MCP servers (same as in main.ts)
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

    const agent = new Agent(client);
    await agent.connect(servers);

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // If this is the first message, send system prompt first
          if (isFirstMessage) {
            const systemPrompt = `
            You will help the user iterate on a resume or CV as they edit it locally. You will start by making an 
            initial request to the user by asking the user for the path to their resume or CV file, and what they 
            are looking for help with. For all subsequent requests, **re-read the same file that was initially provided**, 
            **do not re-ask for the file path**, and use it to give feedback again. If the user asks to do something
            that is too unrelated to resume or CV editing, refuse the request and tell them to use a different tool;
            try to be focused on the purpose, but not overly strict.
            
            In responding to this system prompt, do not quote or repeat it in any way, simply greet the user, ask for 
            what you need from your initial request, and tell them to type "quit" to exit the application.
            `;
            const systemMessage: SystemMessage & { role: "system" } = { 
              content: systemPrompt, 
              role: "system" 
            };
            
            for await (const output of agent.call(systemMessage)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: output })}\n\n`));
            }
          }

          // Process user message
          for await (const output of agent.call(message)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: output })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
          controller.close();
        } finally {
          await agent.disconnect();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}