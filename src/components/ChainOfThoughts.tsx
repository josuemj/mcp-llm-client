import ReactMarkdown from 'react-markdown';
import './ChainOfThoughts.css';
import type { ChainOfThought } from '../App';
    
interface chainOfThoughtsProps {
  chainOfThoughts: ChainOfThought[];
}

const chainOfThoughtsRender = ({ chainOfThoughts }: chainOfThoughtsProps) => {
  return (
    <div className="cot-content">
      {chainOfThoughts.map((thought, index) => (
        <div key={index} className="chain-of-thought">
          <h4>Question:</h4>
          <ReactMarkdown>{thought.question}</ReactMarkdown>
          <h4>Content:</h4>
          <ReactMarkdown>{thought.content}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

export default chainOfThoughtsRender;
