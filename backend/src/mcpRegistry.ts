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
    args: ["C:/Users/josue/uvg/Semestre 8/Redes/spotify-mcp/src/spotify_mcp.py"], // path to your mcp
  }
  // Agregar más MCPs aquí en el futuro
];