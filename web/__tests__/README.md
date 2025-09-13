# Test Suite

This directory contains comprehensive unit and integration tests for the Resume Iterator Web application.

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   └── chat.test.ts       # Tests for /api/chat endpoint
├── integration/           # Integration tests
│   └── chat-flow.test.tsx # End-to-end chat flow tests
├── lib/                   # Library/utility tests
│   ├── converters.test.ts # Tests for MCP/Mistral converters
│   └── types.test.ts      # Type definition tests
├── utils/                 # Test utilities
│   └── test-utils.tsx     # Custom render functions and helpers
├── page.test.tsx          # Main page component tests
└── README.md              # This file
```

## Test Categories

### Unit Tests

**Page Component (`page.test.tsx`)**
- Layout rendering (two-column layout)
- Form interactions (API key, resume text, chat input)
- Button states (enabled/disabled)
- Message display and streaming
- Error handling
- Keyboard shortcuts (Enter to send)

**Converters (`lib/converters.test.ts`)**
- MCP to Mistral tool conversion
- Mistral to MCP tool call conversion
- Tool result message formatting
- Edge cases and error handling

**Types (`lib/types.test.ts`)**
- Type structure validation
- Optional field handling
- Union type support

**API Routes (`api/chat.test.ts`)**
- Request validation
- Streaming response handling
- Error scenarios
- Agent lifecycle management

### Integration Tests

**Chat Flow (`integration/chat-flow.test.tsx`)**
- Complete user interaction flows
- Multi-message conversations
- Error recovery scenarios
- State persistence across interactions

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test page.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="sends message"
```

## Test Features

### Mocking Strategy
- **Fetch API**: Mocked for API calls
- **Streaming**: Custom mock for ReadableStream/SSE
- **Agent Class**: Mocked to isolate UI testing
- **External Dependencies**: Mocked Mistral SDK and MCP SDK

### Test Utilities
- **Custom Render**: Wrapper for React Testing Library
- **Mock Data Factories**: Helper functions for creating test data
- **Stream Helpers**: Utilities for testing streaming responses

### Coverage Areas
- ✅ Component rendering and layout
- ✅ User interactions (typing, clicking, keyboard shortcuts)
- ✅ Form validation and state management
- ✅ API integration and error handling
- ✅ Streaming response processing
- ✅ Type safety and data conversion
- ✅ End-to-end user flows

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Realistic Mocking**: Mocks behave like real implementations
3. **User-Centric**: Tests focus on user behavior, not implementation details
4. **Error Scenarios**: Comprehensive error handling coverage
5. **Async Handling**: Proper handling of promises and streaming responses

## Adding New Tests

When adding new features, ensure you add tests for:

1. **Happy Path**: Normal user interactions work correctly
2. **Edge Cases**: Boundary conditions and unusual inputs
3. **Error Handling**: Network failures, invalid data, etc.
4. **Accessibility**: Screen reader compatibility, keyboard navigation
5. **Performance**: No unnecessary re-renders or API calls

## Test Data

Use the helper functions in `utils/test-utils.tsx` to create consistent test data:

```typescript
import { createMockChatMessage, createMockStreamResponse } from './utils/test-utils'

const message = createMockChatMessage({ content: 'Custom message' })
const response = createMockStreamResponse(['data: {"content": "Response"}\n\n'])
```