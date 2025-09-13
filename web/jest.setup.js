import '@testing-library/jest-dom'

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock ReadableStream for SSE tests
global.ReadableStream = jest.fn().mockImplementation(() => ({
  getReader: jest.fn().mockReturnValue({
    read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
  }),
}))

// Mock TextDecoder
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn().mockReturnValue(''),
}))

// Mock TextEncoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn().mockReturnValue(new Uint8Array()),
}))

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = jest.fn()