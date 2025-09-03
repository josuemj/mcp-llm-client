// src/lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages";

interface StreamCallback {
  onThinking?: (thinking: string) => void;
  onAnswer?: (answer: string) => void;
  onComplete?: (fullResponse: string) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (result: any) => void;
}

class AnthropicService {
  private client: Anthropic;
  private conversationHistory: MessageParam[] = [];
  private backendUrl: string = import.meta.env.VITE_BACKEND_URL;
  private enableChainOfThought: boolean = true;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }

  // Obtener todas las tools disponibles
  async getAllTools() {
    try {
      const response = await fetch(`${this.backendUrl}/api/mcp/tools`);
      const data = await response.json();

      console.log(`Loaded ${data.count} tools from backend`);
      return data.tools || [];
    } catch (error) {
      console.warn("Backend MCP not available:", error);
      return [];
    }
  }

  async sendMessageStream(content: string, callbacks: StreamCallback): Promise<{ message: Message; toolResults?: any[] }> {
    const tools = await this.getAllTools();

    const enhancedContent = this.enableChainOfThought
      ? `Please think through this step-by-step before answering:

      <thinking>
      [Show your reasoning process here]
      </thinking>

      <answer>
      [Your final answer]
      </answer>

      User question: ${content}`
      : content;

    const messagesToSend = [
      ...this.conversationHistory,
      { role: "user", content: enhancedContent } as MessageParam,
    ];

    let fullResponse = "";
    let currentThinking = "";
    let currentAnswer = "";
    let inThinking = false;
    let inAnswer = false;
    let pendingToolCalls: any[] = [];

    const stream = await this.client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: messagesToSend,
      tools: tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      })),
    });

    return new Promise(async (resolve, reject) => {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            fullResponse += text;

            // Detectar inicio de thinking
            if (text.includes('<thinking>')) {
              inThinking = true;
              const thinkingStart = text.indexOf('<thinking>') + 11;
              if (thinkingStart < text.length) {
                currentThinking += text.substring(thinkingStart);
                callbacks.onThinking?.(currentThinking);
              }
              continue;
            }

            // Detectar fin de thinking
            if (text.includes('</thinking>')) {
              inThinking = false;
              const thinkingEnd = text.indexOf('</thinking>');
              if (thinkingEnd > 0) {
                currentThinking += text.substring(0, thinkingEnd);
                callbacks.onThinking?.(currentThinking);
              }
              continue;
            }

            // Detectar inicio de answer
            if (text.includes('<answer>')) {
              inAnswer = true;
              const answerStart = text.indexOf('<answer>') + 8;
              if (answerStart < text.length) {
                currentAnswer += text.substring(answerStart);
                callbacks.onAnswer?.(currentAnswer);
              }
              continue;
            }

            // Detectar fin de answer
            if (text.includes('</answer>')) {
              inAnswer = false;
              const answerEnd = text.indexOf('</answer>');
              if (answerEnd > 0) {
                currentAnswer += text.substring(0, answerEnd);
                callbacks.onAnswer?.(currentAnswer);
              }
              continue;
            }

            // Streaming normal dentro de las secciones
            if (inThinking) {
              currentThinking += text;
              callbacks.onThinking?.(currentThinking);
            } else if (inAnswer) {
              currentAnswer += text;
              callbacks.onAnswer?.(currentAnswer);
            } else if (!this.enableChainOfThought) {
              // Si no hay chain of thought, stream directamente al answer
              currentAnswer += text;
              callbacks.onAnswer?.(currentAnswer);
            }
          }

          // Detectar tool calls
          if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
            const toolCall = chunk.content_block;
            pendingToolCalls.push(toolCall);
            callbacks.onToolCall?.(toolCall.name, toolCall.input);
          }
        }

        const message = await stream.finalMessage();

        // Ejecutar tools si hay
        let toolResults: any[] = [];
        let finalResponseContent = fullResponse;
        
        if (pendingToolCalls.length > 0) {
          toolResults = await this.handleToolCalls(message, callbacks);
          
          // Continuar conversación con resultados de tools
          const finalMessage = await this.client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [
              ...messagesToSend,
              { role: "assistant", content: message.content },
              {
                role: "user",
                content: toolResults.map((result) => ({
                  type: "tool_result",
                  tool_use_id: result.tool_use_id,
                  content: result.content,
                  is_error: result.is_error || false,
                })),
              },
            ],
          });

          // Use final message content for tools response
          finalResponseContent = typeof finalMessage.content === 'string' 
            ? finalMessage.content 
            : finalMessage.content.map(c => c.type === 'text' ? c.text : '').join('');

          resolve({ message: finalMessage, toolResults });
        } else {
          resolve({ message, toolResults });
        }

        // Guardar en historial
        this.conversationHistory.push({ role: "user", content });
        this.conversationHistory.push({
          role: "assistant",
          content: finalResponseContent,
        });

        callbacks.onComplete?.(finalResponseContent);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleToolCalls(response: Message, callbacks?: StreamCallback) {
    const toolResults = [];

    for (const content of response.content) {
      if (content.type === "tool_use") {
        const mcpRequest = {
          tool: content.name,
          arguments: content.input || {},
        };

        try {
          const res = await fetch(`${this.backendUrl}/api/mcp/call`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(mcpRequest),
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          const mcpResponse = await res.json();
          callbacks?.onToolResult?.(mcpResponse);

          toolResults.push({
            tool_use_id: content.id,
            request: mcpRequest,
            response: mcpResponse,
            content: mcpResponse.content?.[0]?.text || JSON.stringify(mcpResponse),
          });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          const errorResult = {
            tool_use_id: content.id,
            request: mcpRequest,
            response: null,
            content: `Error: ${errorMessage}`,
            is_error: true,
          };

          callbacks?.onToolResult?.(errorResult);
          toolResults.push(errorResult);
        }
      }
    }

    return toolResults;
  }

  // Método legacy para compatibilidad
  async sendMessage(content: string): Promise<{ message: Message; toolResults?: any[] }> {
    return this.sendMessageStream(content, {});
  }

  async checkBackendHealth() {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      const data = await response.json();
      console.log("Backend health:", data);
      return true;
    } catch (error) {
      console.error("Backend not available:", error);
      return false;
    }
  }

  // Parsear la respuesta para extraer thinking y answer
  parseResponse(text: string): {
    thinking: string;
    answer: string;
    raw: string;
  } {
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const answerMatch = text.match(/<answer>([\s\S]*?)<\/answer>/);

    return {
      thinking: thinkingMatch ? thinkingMatch[1].trim() : "",
      answer: answerMatch ? answerMatch[1].trim() : text,
      raw: text,
    };
  }

  // Togglear chain of thought
  setChainOfThought(enabled: boolean): void {
    this.enableChainOfThought = enabled;
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  getConversationHistory(): MessageParam[] {
    return [...this.conversationHistory];
  }

  // Obtener solo las respuestas sin los tags de thinking/answer
  getCleanHistory(): Array<{ role: string; content: string }> {
    return this.conversationHistory.map((msg) => {
      if (msg.role === "assistant" && typeof msg.content === "string") {
        const parsed = this.parseResponse(msg.content);
        return {
          role: msg.role,
          content: parsed.answer, // Solo la respuesta, sin el thinking
        };
      }
      return {
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : "",
      };
    });
  }
}

export default AnthropicService;
