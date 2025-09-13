import { toMistralTools, toMcpToolCall, toMistralMessage } from '../../lib/converters'
import type { MCPListToolsResult, MCPCallToolResult } from '../../lib/types'
import type { ToolCall } from '@mistralai/mistralai/models/components'

describe('Converters', () => {
    describe('toMistralTools', () => {
        it('converts MCP tools to Mistral format', () => {
            const mcpTools: MCPListToolsResult = {
                tools: [
                    {
                        name: 'read_file',
                        description: 'Read a file from the filesystem',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' }
                            }
                        }
                    },
                    {
                        name: 'write_file',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                content: { type: 'string' }
                            }
                        }
                    }
                ]
            }

            const result = toMistralTools(mcpTools)

            expect(result).toEqual([
                {
                    type: 'function',
                    function: {
                        name: 'read_file',
                        description: 'Read a file from the filesystem',
                        parameters: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'write_file',
                        description: undefined,
                        parameters: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                content: { type: 'string' }
                            }
                        }
                    }
                }
            ])
        })

        it('handles empty tools list', () => {
            const mcpTools: MCPListToolsResult = {
                tools: []
            }

            const result = toMistralTools(mcpTools)

            expect(result).toEqual([])
        })
    })

    describe('toMcpToolCall', () => {
        it('converts Mistral tool call to MCP format with string arguments', () => {
            const toolCall: ToolCall = {
                id: 'call_123',
                function: {
                    name: 'read_file',
                    arguments: '{"path": "/path/to/file.txt"}'
                }
            }

            const result = toMcpToolCall(toolCall)

            expect(result).toEqual({
                name: 'read_file',
                arguments: {
                    path: '/path/to/file.txt'
                }
            })
        })

        it('converts Mistral tool call to MCP format with object arguments', () => {
            const toolCall: ToolCall = {
                id: 'call_123',
                function: {
                    name: 'write_file',
                    arguments: {
                        path: '/path/to/file.txt',
                        content: 'Hello world'
                    }
                }
            }

            const result = toMcpToolCall(toolCall)

            expect(result).toEqual({
                name: 'write_file',
                arguments: {
                    path: '/path/to/file.txt',
                    content: 'Hello world'
                }
            })
        })

        it('handles tool call without arguments', () => {
            const toolCall: ToolCall = {
                id: 'call_123',
                function: {
                    name: 'list_files'
                }
            }

            const result = toMcpToolCall(toolCall)

            expect(result).toEqual({
                name: 'list_files',
                arguments: undefined
            })
        })
    })

    describe('toMistralMessage', () => {
        it('converts MCP tool result with text content to Mistral message', () => {
            const toolResult: MCPCallToolResult = {
                content: [
                    {
                        type: 'text',
                        text: 'File content here'
                    }
                ]
            }

            const result = toMistralMessage('call_123', toolResult)

            expect(result).toEqual({
                content: 'File content here',
                toolCallId: 'call_123',
                role: 'tool'
            })
        })

        it('converts MCP tool result with multiple content items', () => {
            const toolResult: MCPCallToolResult = {
                content: [
                    {
                        type: 'text',
                        text: 'First part'
                    },
                    {
                        type: 'text',
                        text: 'Second part'
                    }
                ]
            }

            const result = toMistralMessage('call_123', toolResult)

            expect(result).toEqual({
                content: 'First part\nSecond part',
                toolCallId: 'call_123',
                role: 'tool'
            })
        })

        it('converts non-text content to JSON string', () => {
            const toolResult: MCPCallToolResult = {
                content: [
                    {
                        type: 'image',
                        data: 'base64data',
                        mimeType: 'image/png'
                    }
                ]
            }

            const result = toMistralMessage('call_123', toolResult)

            expect(result).toEqual({
                content: JSON.stringify({
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/png'
                }),
                toolCallId: 'call_123',
                role: 'tool'
            })
        })

        it('handles toolResult format', () => {
            const toolResult: MCPCallToolResult = {
                toolResult: {
                    success: true,
                    data: 'some data'
                }
            }

            const result = toMistralMessage('call_123', toolResult)

            expect(result).toEqual({
                content: JSON.stringify({
                    success: true,
                    data: 'some data'
                }),
                toolCallId: 'call_123',
                role: 'tool'
            })
        })

        it('throws error when no tool result is found', () => {
            const toolResult: MCPCallToolResult = {}

            expect(() => toMistralMessage('call_123', toolResult)).toThrow('No tool result found')
        })
    })
})