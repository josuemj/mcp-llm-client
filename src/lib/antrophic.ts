// src/lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages";

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

  async sendMessage(content: string): Promise<{ message: Message; toolResults?: any[] }> {
    const tools = await this.getAllTools();

    // Preparar el contenido con chain of thought si está habilitado
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

    // Crear mensajes para enviar (con el último mensaje mejorado)
    const messagesToSend = [
      ...this.conversationHistory,
      { role: "user", content: enhancedContent } as MessageParam,
    ];

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000, // Aumentado para acomodar el chain of thought
      messages: messagesToSend,
      tools: tools.map(
        (tool: { name: any; description: any; inputSchema: any }) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        })
      ),
    });

    let toolResults: any[] = [];
    let message: Message;

    if (response.content.some((content) => content.type === "tool_use")) {
      toolResults = await this.handleToolCalls(response);

      // Continuar conversación con resultados de tools
      message = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          ...messagesToSend,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: toolResults.map((result) => ({
              type: "tool_result",
              tool_use_id: result.tool_use_id,
              content: result.content,
              is_error: result.is_error,
            })),
          },
        ],
      });
    } else {
      message = response;
    }

    // Guardar en el historial:
    // - El mensaje original del usuario (sin el prompt de CoT)
    // - La respuesta completa del asistente (con thinking y answer)
    this.conversationHistory.push({ role: "user", content });

    if (response.content[0].type === "text") {
      this.conversationHistory.push({
        role: "assistant",
        content: response.content[0].text,
      });
    }

    return { message, toolResults };
  }

  private async handleToolCalls(response: Message) {
    const toolResults = [];

    for (const content of response.content) {
      if (content.type === "tool_use") {
        const mcpRequest = {
          tool: content.name,
          arguments: content.input || {},
        };
        try {
          // Llamar al backend bridge
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

          toolResults.push({
            tool_use_id: content.id,
            request: mcpRequest,
            response: mcpResponse,
            content: JSON.stringify(mcpResponse),
          });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          toolResults.push({
            tool_use_id: content.id,
            request: mcpRequest,
            response: null,
            content: `Error: ${errorMessage}`,
            is_error: true,
          });
        }
      }
    }

    return toolResults;
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
