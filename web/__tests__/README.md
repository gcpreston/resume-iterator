# Resume Iterator Web App Tests

This test suite provides comprehensive coverage for the Resume Iterator web application, focusing on layout, interactivity, and user experience without making actual API calls to Mistral.

## Test Coverage

### ✅ Layout Tests (5 tests)
- **Main header rendering**: Verifies the "Resume Iterator Chat" title displays
- **API key input section**: Ensures the API key input field and label are present
- **Two-column layout**: Confirms both Resume/CV and Chat sections render correctly
- **Chat input area**: Validates the message input and send button are present
- **Welcome message**: Checks the initial welcome message displays when no chat exists

### ✅ API Key Input Tests (2 tests)
- **Text input functionality**: Users can type in the API key field
- **Password field type**: Confirms the API key field is properly masked

### ✅ Resume Text Area Tests (2 tests)
- **Text input functionality**: Users can type and edit resume content
- **Always enabled**: Resume text area is never disabled (unlike chat input)

### ✅ Chat Input Interactivity Tests (3 tests)
- **Disabled when no API key**: Chat input is disabled until API key is provided
- **Enabled with API key**: Chat input becomes enabled when API key is entered
- **Text input functionality**: Users can type messages when enabled

### ✅ Send Button Tests (3 tests)
- **Disabled without API key**: Send button is disabled when no API key
- **Disabled without message**: Send button is disabled when message is empty
- **Enabled with both**: Send button is enabled when both API key and message exist
- **Disabled during loading**: Send button is disabled while processing requests

### ✅ Keyboard Interaction Tests (3 tests)
- **Enter key submission**: Enter key submits messages when conditions are met
- **Shift+Enter prevention**: Shift+Enter does not submit (allows multi-line input)
- **No submission without API key**: Enter key is ignored when API key is missing

### ✅ Message Display Tests (4 tests)
- **User message display**: User messages appear in the chat after sending
- **Input clearing**: Chat input is cleared after successful message sending
- **Loading indicator**: "Thinking..." indicator shows during processing
- **Welcome message hiding**: Welcome message disappears when chat messages exist

### ✅ Error Handling Tests (3 tests)
- **Network error display**: Network errors are displayed as chat messages
- **HTTP error display**: HTTP status errors are displayed appropriately
- **Button re-enabling**: Send button is re-enabled after errors for retry

### ✅ Resume Text Integration Tests (2 tests)
- **API request inclusion**: Resume text is included in API requests when provided
- **Content persistence**: Resume text is maintained during chat interactions

## Key Features Tested

### 🔒 Security & Validation
- API key field is properly masked (password type)
- Input validation prevents submission without required fields
- Error handling for various failure scenarios

### 🎯 User Experience
- Intuitive enable/disable states for inputs and buttons
- Clear visual feedback during loading states
- Persistent resume content during chat sessions
- Keyboard shortcuts (Enter to send, Shift+Enter for new lines)

### 🔄 State Management
- Proper state updates for all form inputs
- Message history management
- Loading state handling
- Error state recovery

### 📱 Responsive Behavior
- Two-column layout renders correctly
- All interactive elements are accessible
- Welcome message shows/hides appropriately

## Test Configuration

### Mocking Strategy
- **Fetch API**: Mocked to prevent actual HTTP requests
- **Markdown Component**: Mocked to avoid import issues
- **DOM APIs**: ScrollIntoView mocked for JSDOM compatibility

### Test Environment
- **Framework**: Jest with React Testing Library
- **Environment**: JSDOM for DOM simulation
- **User Interactions**: @testing-library/user-event for realistic user actions

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test __tests__/app.test.tsx

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Test Quality

- **28 tests** covering all major functionality
- **100% pass rate** with comprehensive assertions
- **No API dependencies** - all external calls are mocked
- **Realistic user interactions** using user-event library
- **Error scenario coverage** including network and HTTP errors
- **Accessibility considerations** using proper ARIA labels and roles

The test suite ensures the web application provides a robust, user-friendly interface for resume iteration with proper validation, error handling, and state management.