# Resume Iterator Web Interface

A NextJS web application that provides a chat interface for the Resume Iterator AI assistant.

## Features

- Clean, responsive chat interface
- Real-time streaming responses from Mistral AI
- API key input for secure authentication
- Built with NextJS 14 and Tailwind CSS
- Integrates with MCP (Model Context Protocol) servers

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Enter your Mistral API key in the input field at the top

5. Start chatting with the Resume Iterator assistant!

## How it works

- The web interface connects to the same Agent class used in the CLI version
- It uses Server-Sent Events (SSE) to stream responses in real-time
- The assistant will help you iterate on your resume or CV files
- It has access to filesystem tools through MCP servers

## Usage

1. Enter your Mistral API key
2. The assistant will greet you and ask for your resume file path
3. Provide the path to your resume/CV file
4. Ask for feedback, suggestions, or help with specific sections
5. The assistant will read your file and provide targeted advice

The assistant is focused on resume/CV editing and will politely decline unrelated requests.