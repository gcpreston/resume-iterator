# resume-iterator

An AI agent tool to give resume/CV feedback. Its purpose is to provide iterative feedback on a file as you edit it, rather than needing you to re-upload a file to a web interface with each new request.

Created for the software engineering intern position at Mistral AI, in Paris.

## Setup and execution

1. Create a `.env` file containing a Mistral API key:

```bash
echo "MISTRAL_API_KEY=<api key here>" >> .env
```

Or simply set an environment variable:

```bash
export MISTRAL_API_KEY=<api key here>
```

2. Install dependencies with `npm install`.
3. Start the program with `npm run dev`.

The program will provide interaction instructions upon startup.

For testing convenience, I've included the text of my CV in markdown in `examples/graham_preston_cv.md`.

## Notes on design

This project's outline follows from [this blog post on using MCP servers with Mistral](https://keesheuperman.com/mcp-with-mistral/). The background complexity that the blog post solves comes from the fact that Mistral's Function Calling API is distinct from the MCP spec, which means types must be defined and conversions must be made. This logic can be found in `types.ts` and `converters.ts`, respectively.

The major modules of this project are `agent.ts` and `main.ts`:
- `agent.ts` provides an API for the agent itself, without any reference to a specific domain. The `Agent` abstraction handles tasks such as connecting to MCP servers, calling Mistral with MCP servers provided, and following a request flow until the end.
- `main.ts` builds the Resume Iterator agent specifically by adding a system message, and defining the input/output interface to be stdin/stdout.

The notable feature of this design is the decoupling of the communication medium from the `Agent` class. Specifically, `Agent.call` returns an `AsyncGenerator<string>` rather than printing to the console. This means that this module could be dropped into a different environment and used seamlessly in a different way, for example in a web application, where the output is added to the UI rather than stdout.

## Notes on testing

Tests have not been included for now. The following things would be useful to be tested:
- the different converters
- `Agent`'s public methods
- the `printGeneratorOutput` helper

While for a real project, tests would be needed for regression assurance, here, the effort does not necessarily outweigh the chance of error. For example, testing `Agent`'s API would mean creating and injecting accurate mocks, which has a high risk of both false positives and false negatives, and is complex. For this single-flow project, I figure it is a better use of time to simply ensure that running the program actually works as intended.
