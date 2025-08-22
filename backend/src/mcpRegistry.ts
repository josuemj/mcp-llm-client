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
    args: ["C:/Users/josue/uvg/Semestre 8/Redes/spotify-mcp/src/spotify_mcp.py"],
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
  }
];
