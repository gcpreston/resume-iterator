import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from "@mistralai/mistralai";
import type { ConversationResponse, FunctionResultEntry, MessageOutputEntry } from "@mistralai/mistralai/models/components";

type AssistantReply = {
  conversationId: string;
  reply: string;
  timestamp: Date;
};

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, resumeText, conversationId } = await request.json();

    // Client initialization
    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
    }
    const client = new Mistral({ apiKey });

    // Tools
    const getResumeText = () => resumeText;

    // Execute conversation
    let conversation = await startOrResumeConversation(client, conversationId, message);
    conversation = await useToolIfNeeded(client, conversation, getResumeText);

    // Generate response
    const reply = conversationToReply(conversation);
    return NextResponse.json(reply);
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function createResumeAgent(client: Mistral) {
  return await client.beta.agents.create({
    model: "mistral-small-latest",
    name: "Resume Agent",
    instructions: `
          You will help the user iterate on a resume or CV as they edit it. You can see the contents of the resume
          or CV at any time using the tool getResumeText. If the user asks to do something that is too unrelated to 
          resume or CV editing, refuse the request and tell them to use a different tool; try to be focused on the 
          purpose, but not overly strict.
    `,
    description: "Agent to give repeated resume or CV feedback.",
    tools: [
      {
        type: "function",
        function: {
          name: "getResumeText",
          description: "Get the current version of the resume or CV that the user is editing.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      }
    ],
  });
}

async function startOrResumeConversation(client: Mistral, conversationId: string | null, message: string): Promise<ConversationResponse> {
  if (conversationId) {
    return await client.beta.conversations.append({
      conversationId: conversationId,
      conversationAppendRequest: {
        inputs: [{ role: "user", content: message }],
      }
    });
  } else {
    const resumeAgent = await createResumeAgent(client);
    return await client.beta.conversations.start({
      agentId: resumeAgent.id,
      inputs: message,
    });
  }
}

async function useToolIfNeeded(client: Mistral, conversation: ConversationResponse, getResumeText: () => string): Promise<ConversationResponse> {
  let output = conversation.outputs[conversation.outputs.length - 1];

  if (output.type === "function.call" && output.name === "getResumeText") {
    const functionResult = JSON.stringify(await getResumeText());
    const toolCallId = output.toolCallId;

    const userFunctionCallingEntry: FunctionResultEntry = {
      toolCallId: toolCallId,
      result: functionResult,
    };

    return await client.beta.conversations.append({
      conversationId: conversation.conversationId,
      conversationAppendRequest: {
        inputs: [userFunctionCallingEntry]
      }
    });
  } else {
    return conversation;
  }
}

function conversationToReply(conversation: ConversationResponse): AssistantReply {
  const firstOutput = conversation.outputs[0];
  if (!firstOutput) {
    throw new Error("No outputs found");
  }

  if (firstOutput.type !== "message.output") {
    throw new Error(`Unable to convert message type ${firstOutput.type} to reply`);
  }

  if (typeof firstOutput.content !== "string") {
    throw new Error("Output streaming is not supported at this time");
  }

  return {
    conversationId: conversation.conversationId,
    reply: firstOutput.content,
    timestamp: firstOutput.completedAt ?? new Date()
  }
}