import ReactMarkdown from 'react-markdown';
import './ChainOfThoughts.css';
import type { ChainOfThought } from '../App';
    
interface chainOfThoughtsProps {
  chainOfThoughts: ChainOfThought[];
}

const chainOfThoughtsRender = ({ chainOfThoughts }: chainOfThoughtsProps) => {
  return (
    <div className="cot-content">
      <div className="cot-header">
        <h3>Chain of Thoughts</h3>
        <span className="cot-subtitle">Internal reasoning process</span>
      </div>
      
      <div className="cot-messages">
        {chainOfThoughts.map((thought, index) => (
          <div key={index} className="cot-message-group">
            <div className="cot-question">
              <div className="cot-question-header">
                <span className="cot-label">Question #{index + 1}</span>
                <span className="cot-timestamp">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="cot-question-content">
                <ReactMarkdown>{thought.question}</ReactMarkdown>
              </div>
            </div>
            
            <div className="cot-thinking">
              <div className="cot-thinking-header">
                <span className="cot-label">Reasoning Process</span>
              </div>
              <div className="cot-thinking-content">
                <ReactMarkdown>{thought.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {chainOfThoughts.length === 0 && (
          <div className="cot-empty">
            <p>No reasoning steps yet. Start a conversation to see the chain of thoughts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default chainOfThoughtsRender;
