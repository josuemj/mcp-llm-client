import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCP_CONFIGS, MCPConfig } from "./mcpRegistry.js";

export class MCPBridge {
  private clients: Map<string, Client> = new Map();
  private tools: any[] = [];

  async initialize() {
    console.log("Initializing MCP Bridge...");

    for (const config of MCP_CONFIGS) {
      try {
        await this.connectMCP(config);
        console.log(`Connected to ${config.name} MCP`);
      } catch (error) {
        console.warn(`Failed to connect ${config.name}:`, error);
      }
    }
    
    await this.loadAllTools();
    console.log(`Loaded ${this.tools.length} tools total`);
  }

  private async connectMCP(config: MCPConfig) {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
    });

    const client = new Client({
      name: "web-bridge",
      version: "1.0.0"
    }, { capabilities: {} });

    await client.connect(transport);
    this.clients.set(config.name, client);
  }

  private async loadAllTools() {
    this.tools = [];
    
    for (const [serverName, client] of this.clients) {
      try {
        const result = await client.listTools();
        const serverTools = result.tools.map(tool => ({
          ...tool,
          _server: serverName
        }));
        this.tools.push(...serverTools);
        console.log(`Loaded ${serverTools.length} tools from ${serverName}`);
      } catch (error) {
        console.warn(`Failed to load tools from ${serverName}:`, error);
      }
    }
  }

  async getTools() {
    return this.tools;
  }

  async callTool(toolName: string, args: any) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found`);
    
    const client = this.clients.get(tool._server);
    if (!client) throw new Error(`Server    ${tool._server} not connected`);

    console.log(`Calling tool: ${toolName}`);
    return await client.callTool({ name: toolName, arguments: args });
  }
}