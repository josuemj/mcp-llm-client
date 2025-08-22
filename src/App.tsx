import "./App.css";
import AnthropicService from "./lib/antrophic";
import ChatHistory from "./components/ChatHistory";
import { useState } from "react";
import bigText from "./test/reponsetest";
import ChainOfThoughtsRender from "./components/ChainOfThoughts";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChainOfThought {
  question: string;
  content: string;
  mcpRequest?: any;
  mcpResponse?: any;
}

const anthropic = new AnthropicService();

function App() {
  const [input, setInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chainOfThoughts, setChainOfThoughts] = useState<ChainOfThought[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [test, setTest] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError("");
    const currentInput = input;
    setInput(""); // Clear input immediately

    if (test) {
      console.log("Testing");
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: bigText,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
      return;
    }

    try {
      console.log("Sending real message");
      const { message, toolResults } = await anthropic.sendMessage(currentInput);
      const text =
        message.content[0].type === "text"
          ? message.content[0].text
          : "No text response";

      // Extraer MCP si existe
      let mcpRequest, mcpResponse;
      if (toolResults && toolResults.length > 0) {
        mcpRequest = toolResults[0].request;
        mcpResponse = toolResults[0].response;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: anthropic.parseResponse(text).answer,
        timestamp: new Date(),
      };

      const chainOfThought: ChainOfThought = {
        question: currentInput,
        content: anthropic.parseResponse(text).thinking,
        mcpRequest,
        mcpResponse,
      };

      setChainOfThoughts((prev) => [...prev, chainOfThought]);
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    anthropic.clearConversation();
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Anthropic Chat</h1>
        <div className="header-buttons">
          <button
            onClick={() => setTest(!test)}
            className={`test-button ${test ? "test-mode" : "real-mode"}`}
          >
            {test ? "Test Mode" : "Real Mode"}
          </button>
          <button onClick={clearChat} className="clear-button">
            Clear Chat
          </button>
        </div>
      </div>

      {chatMessages.length > 0 && (
        <>
          <div className="llm-wrapper">
            <ChatHistory messages={chatMessages} />
            <ChainOfThoughtsRender chainOfThoughts={chainOfThoughts} />
          </div>
        </>
      )}

      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask something..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;
