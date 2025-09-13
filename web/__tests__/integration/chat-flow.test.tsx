import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../../app/page'
import { createMockStreamResponse } from '../../test-utils'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Chat Flow Integration', () => {
    beforeEach(() => {
        mockFetch.mockClear()
    })

    it('completes a full chat interaction', async () => {
        const user = userEvent.setup()

        // Mock streaming response
        mockFetch.mockResolvedValueOnce(
            createMockStreamResponse([
                'data: {"content": "Hello! I\'m here to help you with your resume. "}\n\n',
                'data: {"content": "Could you please provide the path to your resume file?"}\n\n',
                'data: {"done": true}\n\n'
            ])
        )

        render(<Home />)

        // Step 1: Enter API key
        const apiKeyInput = screen.getByLabelText('Mistral API Key:')
        await user.type(apiKeyInput, 'test-api-key-123')

        // Step 2: Enter resume content
        const resumeTextArea = screen.getByPlaceholderText('Paste your resume or CV content here...')
        await user.type(resumeTextArea, 'John Doe\nSoftware Engineer\n\nExperience:\n- 5 years in web development')

        // Step 3: Send first message
        const chatInput = screen.getByPlaceholderText('Type your message here...')
        await user.type(chatInput, 'Can you help me improve my resume?')

        const sendButton = screen.getByRole('button', { name: 'Send' })
        await user.click(sendButton)

        // Verify user message appears
        expect(screen.getByText('Can you help me improve my resume?')).toBeInTheDocument()

        // Verify API call was made correctly
        expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Can you help me improve my resume?',
                apiKey: 'test-api-key-123',
                isFirstMessage: true,
            }),
        })

        // Wait for assistant response
        await waitFor(() => {
            expect(screen.getByText(/Hello! I'm here to help you with your resume/)).toBeInTheDocument()
        })

        // Verify input was cleared
        expect(chatInput).toHaveValue('')

        // Verify resume content is still there
        expect(resumeTextArea).toHaveValue('John Doe\nSoftware Engineer\n\nExperience:\n- 5 years in web development')
    })

    it('handles multiple message exchanges', async () => {
        const user = userEvent.setup()

        // First response
        mockFetch.mockResolvedValueOnce(
            createMockStreamResponse([
                'data: {"content": "I can help you improve your resume. What specific area would you like to focus on?"}\n\n',
                'data: {"done": true}\n\n'
            ])
        )

        // Second response
        mockFetch.mockResolvedValueOnce(
            createMockStreamResponse([
                'data: {"content": "Great! Let me review your experience section and provide some suggestions."}\n\n',
                'data: {"done": true}\n\n'
            ])
        )

        render(<Home />)

        const apiKeyInput = screen.getByLabelText('Mistral API Key:')
        const chatInput = screen.getByPlaceholderText('Type your message here...')
        const sendButton = screen.getByRole('button', { name: 'Send' })

        await user.type(apiKeyInput, 'test-api-key')

        // First message
        await user.type(chatInput, 'Hello')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/I can help you improve your resume/)).toBeInTheDocument()
        })

        // Second message
        await user.type(chatInput, 'I want to improve my experience section')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/Let me review your experience section/)).toBeInTheDocument()
        })

        // Verify both messages are in the chat
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('I want to improve my experience section')).toBeInTheDocument()

        // Verify isFirstMessage is false for second call
        expect(mockFetch).toHaveBeenLastCalledWith('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'I want to improve my experience section',
                apiKey: 'test-api-key',
                isFirstMessage: false,
            }),
        })
    })

    it('handles error recovery', async () => {
        const user = userEvent.setup()

        // First call fails
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        // Second call succeeds
        mockFetch.mockResolvedValueOnce(
            createMockStreamResponse([
                'data: {"content": "Hello! How can I help you?"}\n\n',
                'data: {"done": true}\n\n'
            ])
        )

        render(<Home />)

        const apiKeyInput = screen.getByLabelText('Mistral API Key:')
        const chatInput = screen.getByPlaceholderText('Type your message here...')
        const sendButton = screen.getByRole('button', { name: 'Send' })

        await user.type(apiKeyInput, 'test-api-key')

        // First message fails
        await user.type(chatInput, 'Hello')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('Error: Network error')).toBeInTheDocument()
        })

        // Second message succeeds
        await user.type(chatInput, 'Hello again')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument()
        })

        // Both messages should be visible
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('Hello again')).toBeInTheDocument()
    })

    it('maintains resume content during chat interactions', async () => {
        const user = userEvent.setup()

        mockFetch.mockResolvedValue(
            createMockStreamResponse([
                'data: {"content": "Response"}\n\n',
                'data: {"done": true}\n\n'
            ])
        )

        render(<Home />)

        const apiKeyInput = screen.getByLabelText('Mistral API Key:')
        const resumeTextArea = screen.getByPlaceholderText('Paste your resume or CV content here...')
        const chatInput = screen.getByPlaceholderText('Type your message here...')
        const sendButton = screen.getByRole('button', { name: 'Send' })

        await user.type(apiKeyInput, 'test-api-key')

        // Add resume content
        const resumeContent = 'John Doe\nSoftware Engineer\nExperience: 5 years'
        await user.type(resumeTextArea, resumeContent)

        // Send multiple messages
        await user.type(chatInput, 'First message')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('Response')).toBeInTheDocument()
        })

        // Resume content should still be there
        expect(resumeTextArea).toHaveValue(resumeContent)

        // Send another message
        await user.type(chatInput, 'Second message')
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getAllByText('Response')).toHaveLength(2)
        })

        // Resume content should still be preserved
        expect(resumeTextArea).toHaveValue(resumeContent)
    })
})