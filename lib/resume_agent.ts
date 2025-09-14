import { Mistral } from "@mistralai/mistralai";
import { Agent, ConversationResponse, FunctionResultEntry } from "@mistralai/mistralai/models/components";

type AssistantReply = {
  conversationId: string;
  reply: string;
  timestamp: Date;
};

/**
 * Prompt the agent for feedback on a resume or CV.
 * 
 * @param apiKey         API key for Mistral
 * @param conversationId The current conversation ID, if one exists; null to start a new conversation
 * @param message        The prompt message
 * @param resumeText     The resume in question
 * @returns              The agent's reply to the prompt
 */
export async function getAssistantReply(
  apiKey: string, 
  conversationId: string | null, 
  message: string, 
  resumeText: string
): Promise<AssistantReply> {
  // Client initialization
  const client = new Mistral({ apiKey });

  // Tools
  const getResumeText = () => resumeText;

  // Execute conversation
  let conversation = await startOrResumeConversation(client, conversationId, message);
  conversation = await useToolIfNeeded(client, conversation, getResumeText);

  // Generate response
  return await conversationToReply(conversation);
}


async function createResumeAgent(client: Mistral): Promise<Agent> {
  return await client.beta.agents.create({
    model: "mistral-small-latest",
    name: "Resume Agent",
    instructions: `
          You will help the user iterate on a resume or CV as they edit it. You can see the contents of the resume
          or CV at any time using the tool getResumeText. If the user asks to do something that is too unrelated to 
          resume or CV editing, refuse the request and tell them to use a different tool; try to be focused on the 
          purpose, but not overly strict. On every request, assume the user wants you to read the current version
          of the resume or CV unless otherwise directed. **Never** ask the user for their resume or CV unless you
          have already invoked the getResumeText tool and it returned nothing.
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