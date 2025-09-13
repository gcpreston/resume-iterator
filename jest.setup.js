import "@testing-library/jest-dom";

// Configure React Testing Library to use React's act
global.IS_REACT_ACT_ENVIRONMENT = true;

// Suppress React act warnings in tests since we're properly wrapping user interactions
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes(
        "Warning: The current testing environment is not configured to support act",
      )
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock ReadableStream for SSE tests
global.ReadableStream = jest.fn().mockImplementation(() => ({
  getReader: jest.fn().mockReturnValue({
    read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
  }),
}));

// Mock TextDecoder
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn().mockReturnValue(""),
}));

// Mock TextEncoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn().mockReturnValue(new Uint8Array()),
}));

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = jest.fn();

// Mock Request and Response for Mistral SDK
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || "GET",
  headers: options?.headers || {},
  body: options?.body,
}));

global.Response = jest.fn().mockImplementation((body, options) => ({
  ok: options?.status ? options.status < 400 : true,
  status: options?.status || 200,
  json: () => Promise.resolve(JSON.parse(body || "{}")),
  text: () => Promise.resolve(body || ""),
}));

// Mock marked-react
jest.mock("marked-react", () => {
  return function Markdown({ value }) {
    return value;
  };
});
