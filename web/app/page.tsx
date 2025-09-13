"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

type AssistantReplyJSON = {
    conversationId: string;
    reply: string;
    timestamp: string; // stringified from Date
}

export default function Home() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || !apiKey.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: input.trim(),
                    apiKey: apiKey.trim(),
                    resumeText,
                    conversationId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reply: AssistantReplyJSON = await response.json();

            setConversationId(reply.conversationId);

            setMessages(prev => {
                const newMessages = [...prev];
                newMessages.push({
                    role: "assistant",
                    content: reply.reply,
                    timestamp: new Date(reply.timestamp)
                });

                return newMessages;
            });
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // TODO: Render markdown from replies

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Resume Iterator Chat</h1>

                {/* API Key Input */}
                <div className="flex gap-2 items-center">
                    <label htmlFor="apiKey" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Mistral API Key:
                    </label>
                    <input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Mistral API key"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column - Resume Text Area */}
                <div className="w-1/2 flex flex-col border-r border-gray-200">
                    <div className="bg-white border-b border-gray-200 p-3">
                        <h2 className="text-lg font-semibold text-gray-800">Resume/CV</h2>
                        <p className="text-sm text-gray-600">Paste or type your resume content here</p>
                    </div>
                    <div className="flex-1 p-4">
                        <textarea
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume or CV content here..."
                            className="w-full h-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Right Column - Chat */}
                <div className="w-1/2 flex flex-col">
                    <div className="bg-white border-b border-gray-200 p-3">
                        <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
                        <p className="text-sm text-gray-600">Get feedback and suggestions for your resume</p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 mt-8">
                                <p>Enter your Mistral API key above and start chatting!</p>
                                <p className="text-sm mt-2">This assistant will help you iterate on your resume or CV.</p>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-sm px-4 py-2 rounded-lg ${message.role === "user"
                                        ? "bg-blue-500 text-white"
                                        : message.role === "assistant"
                                            ? "bg-white text-gray-800 shadow-sm border"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        {message.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white text-gray-800 shadow-sm border px-4 py-2 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="bg-white border-t p-4">
                        <div className="flex gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message here..."
                                disabled={!apiKey.trim() || isLoading}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                rows={2}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || !apiKey.trim() || isLoading}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}