import { NextRequest, NextResponse } from 'next/server';
import { getAssistantReply } from "@/lib/resume_agent";

/**
 * Ask for resume feedback via the REST API.
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, resumeText } = await request.json();

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return new Response('Server configuration error: API key not found', { status: 500 });
    }

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    const reply = await getAssistantReply(apiKey, conversationId, message, resumeText);
    return NextResponse.json(reply);
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
