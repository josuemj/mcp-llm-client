import "./App.css";
import AnthropicService from "./lib/antrophic";
import ChatHistory from "./components/ChatHistory";
import {useState} from "react";
import bigText from "./test/reponsetest";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const anthropic = new AnthropicService();

function App() {
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [test, setTest] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    const currentInput = input;
    setInput(''); // Clear input immediately

    if (test) {
      console.log("Testing");
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: bigText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
      return;
    }
    
    try {
      console.log("Sending real message");
      const result = await anthropic.sendMessage(currentInput);
      // Extract text from response
      const text = result.content[0].type === 'text' 
        ? result.content[0].text 
        : 'No text response';
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: text,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      console.log(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
            className={`test-button ${test ? 'test-mode' : 'real-mode'}`}
          >
            {test ? 'Test Mode' : 'Real Mode'}
          </button>
          <button onClick={clearChat} className="clear-button">
            Clear Chat
          </button>
        </div>
      </div>
      
      {chatMessages.length > 0 && (
        <ChatHistory messages={chatMessages} />
      )}
      
      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask something..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
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