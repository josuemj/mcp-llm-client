import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

class AnthropicService {
  private client: Anthropic;
  private conversationHistory: MessageParam[] = [];

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  async sendMessage(content: string): Promise<Message> {
    // Add user message to conversation history
    this.conversationHistory.push({ role: "user", content });

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: this.conversationHistory
    });

    // Add assistant response to conversation history
    if (response.content[0].type === 'text') {
      this.conversationHistory.push({ 
        role: "assistant", 
        content: response.content[0].text 
      });
    }

    return response;
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  getConversationHistory(): MessageParam[] {
    return [...this.conversationHistory];
  }
}

export default AnthropicService;