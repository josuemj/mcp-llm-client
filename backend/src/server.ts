import express from "express";
import cors from "cors";
import { MCPBridge } from "./mcpBridge.js";



const app = express();
const mcpBridge = new MCPBridge();

app.use(
  cors({
    origin:"http://localhost:5173", // frontend
    credentials: true,
  })
);
app.use(express.json());

// Endpoint de salud
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint para obtener todas las tools
app.get("/api/mcp/tools", async (req, res) => {
  try {
    const tools = await mcpBridge.getTools();
    res.json({ tools, count: tools.length });
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error getting tools:", error);
    res.status(500).json({ error: errorMessage });
  }
});

// Endpoint para ejecutar tools
app.post("/api/mcp/call", async (req, res) => {
  try {
    const { tool, arguments: args } = req.body;
    console.log(`📞 Tool call: ${tool}`, args);

    const result = await mcpBridge.callTool(tool, args || {});
    res.json(result);
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error calling tool:", error);
    res.status(500).json({ error: errorMessage });
  }
});

// Inicializar MCPs y servidor
async function start() {
  try {
    await mcpBridge.initialize();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(` - MCP Bridge running on http://localhost:${PORT}`);
      console.log(` - Health check: http://localhost:${PORT}/health`);
      console.log(` - Tools API: http://localhost:${PORT}/api/mcp/tools`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();