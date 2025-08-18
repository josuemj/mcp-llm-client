import MarkdownRenderer from './MarkdownRenderer';
import './ChatHistory.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
}

const ChatHistory = ({ messages }: ChatHistoryProps) => {
  return (
    <div className="chat-history">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          <div className="message-header">
            <span className="role">{message.role === 'user' ? 'You' : 'Claude'}</span>
            <span className="timestamp">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="message-content">
            {message.role === 'assistant' ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;
