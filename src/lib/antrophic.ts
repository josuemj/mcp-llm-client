// src/lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

class AnthropicService {
  private client: Anthropic;
  private conversationHistory: MessageParam[] = [];
  private enableChainOfThought: boolean = true;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  async sendMessage(content: string): Promise<Message> {
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
      { role: "user", content: enhancedContent } as MessageParam
    ];

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000, // Aumentado para acomodar el chain of thought
      messages: messagesToSend
    });

    // Guardar en el historial:
    // - El mensaje original del usuario (sin el prompt de CoT)
    // - La respuesta completa del asistente (con thinking y answer)
    this.conversationHistory.push({ role: "user", content });
    
    if (response.content[0].type === 'text') {
      this.conversationHistory.push({ 
        role: "assistant", 
        content: response.content[0].text 
      });
    }

    return response;
  }

  // Parsear la respuesta para extraer thinking y answer
  parseResponse(text: string): { thinking: string; answer: string; raw: string } {
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const answerMatch = text.match(/<answer>([\s\S]*?)<\/answer>/);
    
    return {
      thinking: thinkingMatch ? thinkingMatch[1].trim() : '',
      answer: answerMatch ? answerMatch[1].trim() : text,
      raw: text
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
    return this.conversationHistory.map(msg => {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        const parsed = this.parseResponse(msg.content);
        return {
          role: msg.role,
          content: parsed.answer // Solo la respuesta, sin el thinking
        };
      }
      return {
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : ''
      };
    });
  }
}

export default AnthropicService;