import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from "@mistralai/mistralai";
import type { ConversationResponse, FunctionResultEntry, MessageOutputEntry } from "@mistralai/mistralai/models/components";

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, isFirstMessage, resumeText, conversationId } = await request.json();

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
    }

    const client = new Mistral({ apiKey });

    const getResumeText = () => resumeText;

    let conversation: ConversationResponse;

    if (isFirstMessage) {
      const resumeAgent = await client.beta.agents.create({
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

      conversation = await client.beta.conversations.start({
        agentId: resumeAgent.id,
        inputs: message,
      });
    } else {
      conversation = await client.beta.conversations.append({
        conversationId: conversationId,
        conversationAppendRequest: {
          inputs: [{ role: "user", content: message }],
        }
      });
    }

    console.log("What is conversation then?", conversation);

    // call function if desired
    let output = conversation.outputs[conversation.outputs.length - 1];

    if (output.type === "function.call" && output.name === "getResumeText") {
      const functionResult = JSON.stringify(await getResumeText());
      const toolCallId = output.toolCallId;

      const userFunctionCallingEntry: FunctionResultEntry = {
        toolCallId: toolCallId,
        result: functionResult,
      };

      conversation = await client.beta.conversations.append({
        conversationId: conversation.conversationId,
        conversationAppendRequest: {
          inputs: [userFunctionCallingEntry]
        }
      });

      const finalEntry = conversation.outputs[conversation.outputs.length - 1];
      const finalMessageOutputEntry = finalEntry as MessageOutputEntry;
      console.log(finalMessageOutputEntry);
    } else {
      console.log(output);
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}