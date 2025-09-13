import { getAssistantReply } from '../lib/resume_agent'
import { Mistral } from '@mistralai/mistralai'

// Mock the entire Mistral SDK
jest.mock('@mistralai/mistralai')

const MockedMistral = Mistral as jest.MockedClass<typeof Mistral>

describe('Resume Agent', () => {
  let mockClient: jest.Mocked<Mistral>
  let mockAgentsCreate: jest.Mock
  let mockConversationsStart: jest.Mock
  let mockConversationsAppend: jest.Mock

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create mock methods
    mockAgentsCreate = jest.fn()
    mockConversationsStart = jest.fn()
    mockConversationsAppend = jest.fn()

    // Create mock client
    mockClient = {
      beta: {
        agents: {
          create: mockAgentsCreate
        },
        conversations: {
          start: mockConversationsStart,
          append: mockConversationsAppend
        }
      }
    } as any

    // Mock the Mistral constructor
    MockedMistral.mockImplementation(() => mockClient)
  })

  describe('getAssistantReply', () => {
    const testApiKey = 'test-api-key-123'
    const testMessage = 'Please review my resume'
    const testResumeText = 'John Doe\nSoftware Engineer\nExperience: 5 years'

    describe('New Conversation (conversationId = null)', () => {
      it('should create a new conversation and return assistant reply', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'Your resume looks great! Here are some suggestions...',
            completedAt: new Date('2024-01-01T10:00:00Z')
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, testResumeText)

        expect(MockedMistral).toHaveBeenCalledWith({ apiKey: testApiKey })
        expect(mockAgentsCreate).toHaveBeenCalledWith({
          model: 'mistral-small-latest',
          name: 'Resume Agent',
          instructions: expect.stringContaining('You will help the user iterate on a resume'),
          description: 'Agent to give repeated resume or CV feedback.',
          tools: [{
            type: 'function',
            function: {
              name: 'getResumeText',
              description: 'Get the current version of the resume or CV that the user is editing.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          }]
        })
        expect(mockConversationsStart).toHaveBeenCalledWith({
          agentId: 'agent-123',
          inputs: testMessage
        })

        expect(result).toEqual({
          conversationId: 'conv-456',
          reply: 'Your resume looks great! Here are some suggestions...',
          timestamp: new Date('2024-01-01T10:00:00Z')
        })
      })

      it('should handle conversation without completedAt timestamp', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'Response without timestamp'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, testResumeText)

        expect(result.timestamp).toBeInstanceOf(Date)
        expect(result.reply).toBe('Response without timestamp')
      })
    })

    describe('Existing Conversation (conversationId provided)', () => {
      it('should resume existing conversation and return assistant reply', async () => {
        const existingConversationId = 'existing-conv-789'
        const mockConversation = {
          conversationId: existingConversationId,
          outputs: [{
            type: 'message.output',
            content: 'Thanks for the follow-up question!',
            completedAt: new Date('2024-01-01T11:00:00Z')
          }]
        }

        mockConversationsAppend.mockResolvedValue(mockConversation)

        const result = await getAssistantReply(testApiKey, existingConversationId, testMessage, testResumeText)

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: existingConversationId,
          conversationAppendRequest: {
            inputs: [{ role: 'user', content: testMessage }]
          }
        })
        expect(mockAgentsCreate).not.toHaveBeenCalled()
        expect(mockConversationsStart).not.toHaveBeenCalled()

        expect(result).toEqual({
          conversationId: existingConversationId,
          reply: 'Thanks for the follow-up question!',
          timestamp: new Date('2024-01-01T11:00:00Z')
        })
      })
    })

    describe('Tool Usage Scenarios', () => {
      it('should handle tool call and provide resume text', async () => {
        const mockAgent = { id: 'agent-123' }
        const initialConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'getResumeText',
            toolCallId: 'tool-call-123'
          }]
        }
        const finalConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'Based on your resume, I can see you have strong experience...',
            completedAt: new Date('2024-01-01T12:00:00Z')
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(initialConversation)
        mockConversationsAppend.mockResolvedValue(finalConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, testResumeText)

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: 'conv-456',
          conversationAppendRequest: {
            inputs: [{
              toolCallId: 'tool-call-123',
              result: JSON.stringify(testResumeText)
            }]
          }
        })

        expect(result).toEqual({
          conversationId: 'conv-456',
          reply: 'Based on your resume, I can see you have strong experience...',
          timestamp: new Date('2024-01-01T12:00:00Z')
        })
      })

      it('should handle tool call with empty resume text', async () => {
        const mockAgent = { id: 'agent-123' }
        const initialConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'getResumeText',
            toolCallId: 'tool-call-123'
          }]
        }
        const finalConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'I notice you haven\'t provided a resume yet...'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(initialConversation)
        mockConversationsAppend.mockResolvedValue(finalConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, '')

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: 'conv-456',
          conversationAppendRequest: {
            inputs: [{
              toolCallId: 'tool-call-123',
              result: JSON.stringify('')
            }]
          }
        })

        expect(result.reply).toBe('I notice you haven\'t provided a resume yet...')
      })

      it('should handle tool call with complex resume text', async () => {
        const complexResumeText = `John Doe
Software Engineer

Contact:
- Email: john@example.com
- Phone: (555) 123-4567

Experience:
• Senior Developer at TechCorp (2020-2024)
  - Led team of 5 developers
  - Increased performance by 40%
• Junior Developer at StartupXYZ (2018-2020)

Skills: JavaScript, TypeScript, React, Node.js`

        const mockAgent = { id: 'agent-123' }
        const initialConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'getResumeText',
            toolCallId: 'tool-call-123'
          }]
        }
        const finalConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'Your resume has a good structure...'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(initialConversation)
        mockConversationsAppend.mockResolvedValue(finalConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, complexResumeText)

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: 'conv-456',
          conversationAppendRequest: {
            inputs: [{
              toolCallId: 'tool-call-123',
              result: JSON.stringify(complexResumeText)
            }]
          }
        })

        expect(result.reply).toBe('Your resume has a good structure...')
      })
    })

    describe('Error Handling', () => {
      it('should throw error when conversation has no outputs', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: []
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow()
      })

      it('should handle edge case where outputs exist but first output is undefined', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [undefined] // Edge case: outputs array has undefined element
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow()
      })

      it('should throw error when first output is not a message', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'someOtherFunction'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow('Unable to convert message type function.call to reply')
      })

      it('should throw error when content is not a string (streaming)', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: { stream: true } // Non-string content
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow('Output streaming is not supported at this time')
      })

      it('should propagate Mistral API errors', async () => {
        const apiError = new Error('API rate limit exceeded')
        mockAgentsCreate.mockRejectedValue(apiError)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow('API rate limit exceeded')
      })

      it('should propagate conversation start errors', async () => {
        const mockAgent = { id: 'agent-123' }
        const conversationError = new Error('Invalid agent ID')
        
        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockRejectedValue(conversationError)

        await expect(getAssistantReply(testApiKey, null, testMessage, testResumeText))
          .rejects.toThrow('Invalid agent ID')
      })

      it('should propagate conversation append errors', async () => {
        const existingConversationId = 'existing-conv-789'
        const appendError = new Error('Conversation not found')
        
        mockConversationsAppend.mockRejectedValue(appendError)

        await expect(getAssistantReply(testApiKey, existingConversationId, testMessage, testResumeText))
          .rejects.toThrow('Conversation not found')
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty message input', async () => {
        const mockAgent = { id: 'agent-123' }
        const mockConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'How can I help you with your resume?'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(mockConversation)

        const result = await getAssistantReply(testApiKey, null, '', testResumeText)

        expect(mockConversationsStart).toHaveBeenCalledWith({
          agentId: 'agent-123',
          inputs: ''
        })
        expect(result.reply).toBe('How can I help you with your resume?')
      })

      it('should handle special characters in resume text', async () => {
        const specialResumeText = `José María García-López
Software Engineer @ TechCorp™

Skills: C++, C#, .NET, SQL Server
Email: josé.garcía@example.com
Salary: $100,000+ USD

"Passionate developer with 10+ years experience"`

        const mockAgent = { id: 'agent-123' }
        const initialConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'getResumeText',
            toolCallId: 'tool-call-123'
          }]
        }
        const finalConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'I can see your international background...'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(initialConversation)
        mockConversationsAppend.mockResolvedValue(finalConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, specialResumeText)

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: 'conv-456',
          conversationAppendRequest: {
            inputs: [{
              toolCallId: 'tool-call-123',
              result: JSON.stringify(specialResumeText)
            }]
          }
        })

        expect(result.reply).toBe('I can see your international background...')
      })

      it('should handle very long resume text', async () => {
        const longResumeText = 'A'.repeat(10000) // 10KB of text

        const mockAgent = { id: 'agent-123' }
        const initialConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'function.call',
            name: 'getResumeText',
            toolCallId: 'tool-call-123'
          }]
        }
        const finalConversation = {
          conversationId: 'conv-456',
          outputs: [{
            type: 'message.output',
            content: 'Your resume is quite detailed...'
          }]
        }

        mockAgentsCreate.mockResolvedValue(mockAgent)
        mockConversationsStart.mockResolvedValue(initialConversation)
        mockConversationsAppend.mockResolvedValue(finalConversation)

        const result = await getAssistantReply(testApiKey, null, testMessage, longResumeText)

        expect(mockConversationsAppend).toHaveBeenCalledWith({
          conversationId: 'conv-456',
          conversationAppendRequest: {
            inputs: [{
              toolCallId: 'tool-call-123',
              result: JSON.stringify(longResumeText)
            }]
          }
        })

        expect(result.reply).toBe('Your resume is quite detailed...')
      })
    })
  })
})