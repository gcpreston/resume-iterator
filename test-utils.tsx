import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

// Custom render function that includes any providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { ...options });

export * from "@testing-library/react";
export { customRender as render };

// Mock data helpers
export const createMockChatMessage = (overrides = {}) => ({
  role: "user" as const,
  content: "Test message",
  timestamp: new Date("2023-01-01T00:00:00Z"),
  ...overrides,
});

export const createMockMCPServer = (overrides = {}) => ({
  name: "test-server",
  command: "npx",
  args: ["test-command"],
  ...overrides,
});

export const createMockToolResult = (overrides = {}) => ({
  content: [
    {
      type: "text" as const,
      text: "Mock tool result",
    },
  ],
  ...overrides,
});

// Test helpers
export const waitForStreamToComplete = async (response: Response) => {
  const reader = response.body?.getReader();
  if (!reader) return;

  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }
};

export const createMockStreamResponse = (chunks: string[]) => {
  let chunkIndex = 0;

  return {
    ok: true,
    body: {
      getReader: () => ({
        read: jest.fn().mockImplementation(() => {
          if (chunkIndex < chunks.length) {
            const chunk = chunks[chunkIndex++];
            return Promise.resolve({
              done: false,
              value: new TextEncoder().encode(chunk),
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      }),
    },
  };
};
