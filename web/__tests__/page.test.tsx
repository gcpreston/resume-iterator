import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../app/page'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Home Page', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders the main layout with two columns', () => {
    render(<Home />)
    
    // Check header
    expect(screen.getByText('Resume Iterator Chat')).toBeInTheDocument()
    expect(screen.getByLabelText('Mistral API Key:')).toBeInTheDocument()
    
    // Check left column
    expect(screen.getByText('Resume/CV')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Paste your resume or CV content here...')).toBeInTheDocument()
    
    // Check right column
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument()
  })

  it('shows initial welcome message when no messages exist', () => {
    render(<Home />)
    
    expect(screen.getByText('Enter your Mistral API key above and start chatting!')).toBeInTheDocument()
    expect(screen.getByText('This assistant will help you iterate on your resume or CV.')).toBeInTheDocument()
  })

  it('allows typing in the resume text area', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const resumeTextArea = screen.getByPlaceholderText('Paste your resume or CV content here...')
    
    await user.type(resumeTextArea, 'John Doe\nSoftware Engineer')
    
    expect(resumeTextArea).toHaveValue('John Doe\nSoftware Engineer')
  })

  it('allows typing in the API key field', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    
    await user.type(apiKeyInput, 'test-api-key')
    
    expect(apiKeyInput).toHaveValue('test-api-key')
  })

  it('allows typing in the chat input when API key is provided', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    
    // First provide API key to enable the input
    await act(async () => {
      await user.type(apiKeyInput, 'test-api-key')
    })
    
    await act(async () => {
      await user.type(chatInput, 'Hello, can you help me with my resume?')
    })
    
    expect(chatInput).toHaveValue('Hello, can you help me with my resume?')
  })

  it('disables send button when API key is empty', () => {
    render(<Home />)
    
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    expect(sendButton).toBeDisabled()
  })

  it('disables send button when message is empty', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    await user.type(apiKeyInput, 'test-api-key')
    
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when both API key and message are provided', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(chatInput, 'Hello')
    
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    expect(sendButton).not.toBeDisabled()
  })

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    
    await act(async () => {
      await user.type(apiKeyInput, 'test-api-key')
      await user.type(chatInput, 'Hello')
      await user.keyboard('{Enter}')
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello',
        apiKey: 'test-api-key',
        isFirstMessage: true,
      }),
    })
  })

  it('prevents Enter key from sending when Shift is held', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(chatInput, 'Hello')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('displays user message after sending', async () => {
    const user = userEvent.setup()
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await act(async () => {
      await user.type(apiKeyInput, 'test-api-key')
      await user.type(chatInput, 'Hello, can you help me?')
      await user.click(sendButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument()
    })
  })

  it('shows loading indicator while processing', async () => {
    const user = userEvent.setup()
    
    // Mock API response that takes time
    const mockReader = {
      read: jest.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ done: true, value: undefined }), 100)
      }))
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(chatInput, 'Hello')
    await user.click(sendButton)
    
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('clears input after sending message', async () => {
    const user = userEvent.setup()
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await act(async () => {
      await user.type(apiKeyInput, 'test-api-key')
      await user.type(chatInput, 'Hello')
      await user.click(sendButton)
    })
    
    await waitFor(() => {
      expect(chatInput).toHaveValue('')
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(chatInput, 'Hello')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })
  })

  it('handles HTTP errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await user.type(apiKeyInput, 'test-api-key')
    await user.type(chatInput, 'Hello')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('Error: HTTP error! status: 400')).toBeInTheDocument()
    })
  })

  it('handles basic message sending', async () => {
    const user = userEvent.setup()
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    })
    
    render(<Home />)
    
    const apiKeyInput = screen.getByLabelText('Mistral API Key:')
    const chatInput = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: 'Send' })
    
    await act(async () => {
      await user.type(apiKeyInput, 'test-api-key')
      await user.type(chatInput, 'Hello')
      await user.click(sendButton)
    })
    
    // Verify the message was sent
    expect(mockFetch).toHaveBeenCalled()
  })
})