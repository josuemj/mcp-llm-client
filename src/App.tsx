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
  isStreaming?: boolean;
}

export interface ChainOfThought {
  question: string;
  content: string;
  mcpRequest?: any;
  mcpResponse?: any;
  isStreaming?: boolean;
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
  
  // Estados para streaming
  const [streamingThinking, setStreamingThinking] = useState("");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [currentTools, setCurrentTools] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableMCPs();
  }, []);

  const loadAvailableMCPs = async () => {
    try {
      const tools = await anthropic.getAllTools();
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

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError("");
    const currentInput = input;
    setInput("");

    // Reset streaming states
    setStreamingThinking("");
    setStreamingAnswer("");
    setCurrentTools([]);

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

    // Crear mensaje de streaming inicial para el chat
    const streamingMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    // Crear chain of thought inicial
    const streamingThought: ChainOfThought = {
      question: currentInput,
      content: "",
      isStreaming: true,
    };

    // Agregar mensaje streaming al chat
    setChatMessages((prev) => [...prev, streamingMessage]);
    setChainOfThoughts((prev) => [...prev, streamingThought]);

    const messageIndex = chatMessages.length + 1; // +1 porque acabamos de agregar user message
    const thoughtIndex = chainOfThoughts.length;

    try {
      console.log("Sending streaming message");
      
      const { message, toolResults } = await anthropic.sendMessageStream(currentInput, {
        onThinking: (thinking) => {
          setStreamingThinking(thinking);
          // Actualizar chain of thought en tiempo real
          setChainOfThoughts((prev) => 
            prev.map((thought, i) => 
              i === thoughtIndex 
                ? { ...thought, content: thinking, isStreaming: true }
                : thought
            )
          );
        },
        
        onAnswer: (answer) => {
          setStreamingAnswer(answer);
          // Actualizar mensaje del chat en tiempo real
          setChatMessages((prev) => 
            prev.map((msg, i) => 
              i === messageIndex 
                ? { ...msg, content: answer, isStreaming: true }
                : msg
            )
          );
        },
        
        onToolCall: (toolName, args) => {
          console.log(`🔧 Tool called: ${toolName}`, args);
          setCurrentTools((prev) => [...prev, `🔄 Executing: ${toolName}`]);
        },
        
        onToolResult: (result) => {
          console.log(`✅ Tool result received:`, result);
          setCurrentTools((prev) => 
            prev.map((tool, i) => 
              i === prev.length - 1 
                ? tool.replace('🔄 Executing:', '✅ Completed:')
                : tool
            )
          );
        },
        
        onComplete: (fullResponse) => {
          console.log("Stream completed");
          
          const parsed = anthropic.parseResponse(fullResponse);
          
          // Finalizar mensaje del chat
          setChatMessages((prev) => 
            prev.map((msg, i) => 
              i === messageIndex 
                ? { 
                    ...msg, 
                    content: parsed.answer || streamingAnswer || "Response completed",
                    isStreaming: false 
                  }
                : msg
            )
          );

          // Finalizar chain of thought
          setChainOfThoughts((prev) => 
            prev.map((thought, i) => 
              i === thoughtIndex 
                ? { 
                    ...thought, 
                    content: parsed.thinking || streamingThinking || "Thinking completed",
                    mcpRequest: toolResults?.[0]?.request,
                    mcpResponse: toolResults?.[0]?.response,
                    isStreaming: false 
                  }
                : thought
            )
          );

          // Limpiar estados de streaming
          setStreamingThinking("");
          setStreamingAnswer("");
          setCurrentTools([]);
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      
      // Remover mensajes de streaming en caso de error
      setChatMessages((prev) => prev.slice(0, -1));
      setChainOfThoughts((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setChainOfThoughts([]);
    setStreamingThinking("");
    setStreamingAnswer("");
    setCurrentTools([]);
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

      {/* Mostrar herramientas en ejecución */}
      {currentTools.length > 0 && (
        <div className="tools-executing">
          <h4>🤖 MCP Tools:</h4>
          {currentTools.map((tool, index) => (
            <div key={index} className="tool-status">
              {tool}
            </div>
          ))}
        </div>
      )}

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
          {loading ? "Thinking..." : "Send"}
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
              <div className="modal-body-content">
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
        </div>
      )}
    </div>
  );
}

export default App;
