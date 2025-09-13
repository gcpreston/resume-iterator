import type { 
  MCPServer, 
  MCPListToolsResult, 
  MistralTool, 
  MCPCallToolRequest,
  MCPCallToolResult,
  MistralToolMessage,
  ChatMessage 
} from '../../lib/types'

describe('Types', () => {
  describe('MCPServer', () => {
    it('should have correct structure', () => {
      const server: MCPServer = {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', './']
      }

      expect(server.name).toBe('filesystem')
      expect(server.command).toBe('npx')
      expect(Array.isArray(server.args)).toBe(true)
    })
  })

  describe('MCPListToolsResult', () => {
    it('should have correct structure with tools', () => {
      const result: MCPListToolsResult = {
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' }
              }
            }
          }
        ]
      }

      expect(Array.isArray(result.tools)).toBe(true)
      expect(result.tools[0].name).toBe('read_file')
    })

    it('should allow optional nextCursor', () => {
      const result: MCPListToolsResult = {
        tools: [],
        nextCursor: 'cursor123'
      }

      expect(result.nextCursor).toBe('cursor123')
    })
  })

  describe('MistralTool', () => {
    it('should have correct structure', () => {
      const tool: MistralTool = {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read a file',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            }
          }
        }
      }

      expect(tool.type).toBe('function')
      expect(tool.function.name).toBe('read_file')
    })
  })

  describe('MCPCallToolRequest', () => {
    it('should have correct structure', () => {
      const request: MCPCallToolRequest = {
        name: 'read_file',
        arguments: {
          path: '/path/to/file.txt'
        }
      }

      expect(request.name).toBe('read_file')
      expect(request.arguments).toEqual({ path: '/path/to/file.txt' })
    })

    it('should allow optional arguments', () => {
      const request: MCPCallToolRequest = {
        name: 'list_files'
      }

      expect(request.name).toBe('list_files')
      expect(request.arguments).toBeUndefined()
    })
  })

  describe('MCPCallToolResult', () => {
    it('should support content format', () => {
      const result: MCPCallToolResult = {
        content: [
          {
            type: 'text',
            text: 'File content'
          }
        ],
        isError: false
      }

      expect(Array.isArray(result.content)).toBe(true)
      expect(result.isError).toBe(false)
    })

    it('should support toolResult format', () => {
      const result: MCPCallToolResult = {
        toolResult: {
          success: true,
          data: 'some data'
        }
      }

      expect(result.toolResult).toEqual({
        success: true,
        data: 'some data'
      })
    })
  })

  describe('MistralToolMessage', () => {
    it('should have correct structure', () => {
      const message: MistralToolMessage = {
        role: 'tool',
        content: 'Tool response',
        toolCallId: 'call_123',
        name: 'read_file'
      }

      expect(message.role).toBe('tool')
      expect(message.content).toBe('Tool response')
      expect(message.toolCallId).toBe('call_123')
    })

    it('should allow null content', () => {
      const message: MistralToolMessage = {
        role: 'tool',
        content: null,
        toolCallId: 'call_123'
      }

      expect(message.content).toBeNull()
    })
  })

  describe('ChatMessage', () => {
    it('should have correct structure', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello, can you help me?',
        timestamp: new Date('2023-01-01T00:00:00Z')
      }

      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, can you help me?')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('should support all role types', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'User message',
        timestamp: new Date()
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Assistant message',
        timestamp: new Date()
      }

      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'System message',
        timestamp: new Date()
      }

      expect(userMessage.role).toBe('user')
      expect(assistantMessage.role).toBe('assistant')
      expect(systemMessage.role).toBe('system')
    })
  })
})