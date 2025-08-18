const bigText = `
React is a popular JavaScript library for building user interfaces, particularly web applications. Here are the key things to know about React:

## What React Is
- **JavaScript Library**: Created and maintained by Facebook (now Meta)
- **Component-Based**: Build UIs using reusable components
- **Declarative**: Describe what the UI should look like, not how to manipulate it

## Key Features

### 1. **Components**
\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`

### 2. **JSX Syntax**
- Allows you to write HTML-like code within JavaScript
- Gets compiled to regular JavaScript

### 3. **Virtual DOM**
- React creates a virtual representation of the DOM
- Efficiently updates only the parts that changed

### 4. **State Management**
\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

## Common Use Cases
- Single Page Applications (SPAs)
- Interactive web interfaces
- Mobile apps (with React Native)
- Desktop applications (with Electron)

## Why Developers Use React
- **Reusable Components**: Write once, use anywhere
- **Large Ecosystem**: Huge community and many third-party libraries
- **Performance**: Efficient rendering with Virtual DOM
- **Developer Tools**: Excellent debugging and development experience

React is widely adopted by companies like Netflix, Airbnb, Instagram, and many others for building modern web applications.
`;

export default bigText;