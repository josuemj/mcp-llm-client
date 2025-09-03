import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

export interface MCPConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}



export const MCP_CONFIGS: MCPConfig[] = [
  {
    name: "spotify",
    command: "python",
    args: ["C:/Users/josue/OneDrive/Escritorio/spotify-mcp/src/spotify_mcp.py"],
  },
  {
    name: "github",
    command: "docker",
    args: [
      "run",
      "-i",
      "--rm",
      "-e",
      `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
      "ghcr.io/github/github-mcp-server",
      "stdio"
    ]
  },
  {
    name: "warframe-market",
    command: "node",
    args: ["C:/Users/josue/uvg/Semestre 8/Redes/mwf-mcp/dist/index.js"]
  },
  {
    name: "personal_trainer",
    command: "C:/Users/josue/uvg/Semestre 8/Redes/chatbot-server/.venv/Scripts/python.exe",
    args: ["C:/Users/josue/uvg/Semestre 8/Redes/chatbot-server/server.py"]
  },  
  {
    name: "countries-info",
    command: "npx",
    args: [
      "mcp-remote",
      "https://remote-mcp-server-authless.josuemj456.workers.dev/sse"
    ]
  },
  {
    name: "filesystem",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "C:\\Users\\josue"
    ]
    }
];
