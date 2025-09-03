import MarkdownRenderer from './MarkdownRenderer';
import './ChatHistory.css';
import type{ ChatMessage } from "../App";

interface ChatHistoryProps {
  messages: ChatMessage[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  if (messages.length === 0) return null;

  return (
    <div className="chat-history">
      <h3>💬 Chat History</h3>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}
        >
          <div className="message-header">
            <span className="message-role">
              {message.role === "user" ? "👤 You" : "🤖 Claude"}
            </span>
            <span className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="message-content">
            {message.role === "user" ? (
              // Para mensajes del usuario, mostrar texto simple
              <div className="user-message">
                {message.content || (message.isStreaming ? "Typing..." : "")}
              </div>
            ) : (
              // Para mensajes de Claude, usar MarkdownRenderer
              <>
                {message.content ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <div className="thinking-placeholder">
                    {message.isStreaming ? "Thinking..." : ""}
                  </div>
                )}
              </>
            )}
            {message.isStreaming && <span className="typing-cursor">|</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;
