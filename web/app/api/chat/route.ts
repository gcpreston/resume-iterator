import { NextRequest, NextResponse } from 'next/server';
import { getAssistantReply } from "@/lib/resume_agent";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, conversationId, message, resumeText } = await request.json();

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
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
