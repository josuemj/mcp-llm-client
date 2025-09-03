import "./App.css";
import AnthropicService from "./lib/antrophic";
import ChatHistory from "./components/ChatHistory";
import { useState, useEffect } from "react";
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
  const [mcpDropdownOpen, setMcpDropdownOpen] = useState(false);
  const [availableMCPs, setAvailableMCPs] = useState<any[]>([]);
  const [selectedMCP, setSelectedMCP] = useState<any>(null);
  const [showMCPModal, setShowMCPModal] = useState(false);

  useEffect(() => {
    loadAvailableMCPs();
  }, []);

  const loadAvailableMCPs = async () => {
    try {
      const tools = await anthropic.getAllTools();
      // Group tools by server
      const mcpGroups: { [key: string]: any[] } = {};
      tools.forEach((tool: any) => {
        const serverName = tool._server || 'Unknown';
        if (!mcpGroups[serverName]) {
          mcpGroups[serverName] = [];
        }
        mcpGroups[serverName].push(tool);
      });

      const mcps = Object.keys(mcpGroups).map(serverName => ({
        name: serverName,
        tools: mcpGroups[serverName]
      }));
      
      setAvailableMCPs(mcps);
    } catch (error) {
      console.error('Failed to load MCPs:', error);
    }
  };

  const handleMCPClick = (mcp: any) => {
    setSelectedMCP(mcp);
    setShowMCPModal(true);
    setMcpDropdownOpen(false);
  };

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
        <div className="mcp-dropdown-wrapper">
          <button 
            className="mcp-dropdown-trigger"
            onClick={() => setMcpDropdownOpen(!mcpDropdownOpen)}
          >
            MCPs ({availableMCPs.length})
            <span className={`dropdown-arrow ${mcpDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {mcpDropdownOpen && (
            <div className="mcp-dropdown">
              {availableMCPs.length === 0 ? (
                <div className="mcp-item disabled">No MCPs available</div>
              ) : (
                availableMCPs.map((mcp, index) => (
                  <div 
                    key={index}
                    className="mcp-item"
                    onClick={() => handleMCPClick(mcp)}
                  >
                    <div className="mcp-name">{mcp.name}</div>
                    <div className="mcp-tool-count">{mcp.tools.length} tools</div>
                  </div>
                ))
              )}
            </div>
          )}
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

      <div className={`input-section ${chatMessages.length === 0 ? "centered" : ""}`}>
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
        {chatMessages.length > 0 && (
          <button onClick={clearChat} className="clear-button">
            Clear Chat
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {showMCPModal && selectedMCP && (
        <div className="modal-overlay" onClick={() => setShowMCPModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMCP.name} MCP Tools</h2>
              <button 
                className="modal-close"
                onClick={() => setShowMCPModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedMCP.tools.map((tool: any, index: number) => (
                <div key={index} className="tool-item">
                  <div className="tool-header">
                    <h3 className="tool-name">{tool.name}</h3>
                  </div>
                  <p className="tool-description">{tool.description}</p>
                  {tool.inputSchema && (
                    <div className="tool-schema">
                      <h4>Input Schema:</h4>
                      <pre className="schema-json">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
