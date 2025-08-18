import "./App.css";
import AnthropicService from "./lib/antrophic";
import MarkdownRenderer from "./components/MarkdownRenderer";
import {useState} from "react";
import bigText from "./test/reponsetest";

const anthropic = new AnthropicService();

function App() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [test, setTest] = useState(true)

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse('');

    if (test){
      console.log("Testing");
      setResponse(bigText)
      setLoading(false)
      return;
    }
    
    try {
      console.log("No real data is being shown")
      const result = await anthropic.sendMessage(input);
      // Extract text from response
      const text = result.content[0].type === 'text' 
        ? result.content[0].text 
        : 'No text response';
      setResponse(text);
      console.log(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Anthropic Chat</h1>
      
      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask something..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="response-section">
          <strong>Response:</strong>
          <MarkdownRenderer content={response} />
        </div>
      )}
    </div>
  );
}

export default App;