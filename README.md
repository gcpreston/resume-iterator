# resume-iterator

An AI agent tool to give resume/CV feedback. Its purpose is to provide iterative, directed feedback, without needing for you to re-upload a file to a web interface with each new request.

Created for the software engineering intern position at Mistral AI, in Paris.

## Local setup and execution

1. Install dependencies with `npm install`
2. Create a `.env` file in the root directory and add your Mistral API key:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```
3. Start the server with `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser
5. Start asking for feedback

For testing convenience, I've included the text of my CV in markdown in `examples/graham_preston_cv.md`.

## Design

This is a NextJS web application. The resume agent internals are meant to be opaque to the end user; for this reason, an architecture with a backend was chosen, rather than a frontend which directly uses the Mistral SDK. This has two main advantages:
1. No need for the user to enter their own API key, which means one less step for getting started
2. Smaller bundle size, since there is no need to include the Mistral API SDK with the frontend JS

As such, there are 3 layers for this basic project: the user interface, the REST API, and the business logic. Each layer is contained to its own module: the UI in `app/page.tsx`, the API in `app/api/route.ts`, and the business logic in `resume_agent.ts`. The interfaces between these modules are made to be as simple as possible: `resume_agent.ts` exposes a single function to the web API `getAssistantReply`, which does all the work to call the Mistral API iteratively and give back the reply that the user cares about. Likewise, the web API exposes one endpoint to the frontend, `POST /api/chat`, which does the same.

## Tests

Tests can be found in the `__tests__` directory. Jest mocks are used in place of API calls; `app.test.tsx` mocks fetch calls to the backend, while `resume_agent.test.ts` mocks calls to the Mistral API SDK.