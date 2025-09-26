import { WebSocketServer, WebSocket } from "ws";
import { mcpConfig } from "@/config/mcp.config";
import { wait } from "@/utils/wait";
import { isPortInUse, killProcessOnPort } from "@/utils/port";
import type { Tool } from "@/tools/tool";
import type { Resource } from "@/resources/resource";
import { Context } from "@/context";

interface MCPMessage {
    jsonrpc: string;
    id?: number | string;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

interface ExtensionMessage {
    type: string;
    [key: string]: any;
}

export class WebSocketMCPServer {
    private wss: WebSocketServer;
    private context: Context;
    private tools: Tool[];
    private resources: Resource[];
    private extensionConnections = new Set<WebSocket>();
    private mcpConnections = new Set<WebSocket>();

    constructor(tools: Tool[], resources: Resource[]) {
        this.tools = tools;
        this.resources = resources;
        this.context = new Context();
    }

    async start(port: number = mcpConfig.defaultWsPort) {
        console.log(`🚀 Starting WebSocket MCP Server on port ${port}...`);

        // Clean up any existing process on this port
        await killProcessOnPort(port);
        while (await isPortInUse(port)) {
            await wait(100);
        }

        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws, req) => {
            console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
            this.handleConnection(ws);
        });

        this.wss.on('listening', () => {
            console.log(`✅ WebSocket MCP Server listening on port ${port}`);
        });

        this.wss.on('error', (error) => {
            console.error('❌ WebSocket server error:', error);
        });

        return this.wss;
    }

    private handleConnection(ws: WebSocket) {
        let connectionType: 'unknown' | 'extension' | 'mcp' = 'unknown';

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message:', message);

                // Detect connection type based on first message
                if (connectionType === 'unknown') {
                    if (this.isExtensionMessage(message)) {
                        connectionType = 'extension';
                        this.extensionConnections.add(ws);
                        console.log('🔌 Detected Extension connection');

                        // Set this as the context websocket for extension communication
                        if (this.context.hasWs()) {
                            this.context.ws.close();
                        }
                        this.context.ws = ws;
                    } else if (this.isMCPMessage(message)) {
                        connectionType = 'mcp';
                        this.mcpConnections.add(ws);
                        console.log('🔌 Detected MCP client connection');
                    }
                }

                // Route message based on connection type
                if (connectionType === 'extension') {
                    await this.handleExtensionMessage(ws, message);
                } else if (connectionType === 'mcp') {
                    await this.handleMCPMessage(ws, message);
                }

            } catch (error) {
                console.error('❌ Error handling message:', error);
                ws.send(JSON.stringify({
                    error: { code: -32700, message: 'Parse error' }
                }));
            }
        });

        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            this.extensionConnections.delete(ws);
            this.mcpConnections.delete(ws);

            // If this was the context websocket, clear it
            if (this.context.hasWs() && this.context.ws === ws) {
                (this.context as any)._ws = null;
            }
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket connection error:', error);
        });
    }

    private isExtensionMessage(message: any): boolean {
        return message.type && typeof message.type === 'string' &&
               ['auth', 'capabilities', 'ping'].includes(message.type);
    }

    private isMCPMessage(message: any): boolean {
        return message.jsonrpc === '2.0' &&
               (message.method || message.result !== undefined || message.error !== undefined);
    }

    private async handleExtensionMessage(ws: WebSocket, message: ExtensionMessage) {
        console.log('🔧 Handling extension message:', message.type);

        switch (message.type) {
            case 'auth':
                // Handle authentication
                console.log('🔐 Extension authentication');
                ws.send(JSON.stringify({ type: 'auth_success' }));
                break;

            case 'capabilities':
                // Handle capabilities announcement
                console.log('📋 Extension capabilities:', message.data);
                ws.send(JSON.stringify({ type: 'capabilities_received' }));
                break;

            case 'ping':
                // Handle ping
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;

            default:
                console.log('⚠️ Unknown extension message type:', message.type);
        }
    }

    private async handleMCPMessage(ws: WebSocket, message: MCPMessage) {
        console.log('🎯 Handling MCP message:', message.method);

        try {
            switch (message.method) {
                case 'tools/list':
                    await this.handleToolsList(ws, message);
                    break;

                case 'tools/call':
                    await this.handleToolCall(ws, message);
                    break;

                case 'resources/list':
                    await this.handleResourcesList(ws, message);
                    break;

                case 'resources/read':
                    await this.handleResourceRead(ws, message);
                    break;

                default:
                    this.sendMCPError(ws, message.id, -32601, `Method not found: ${message.method}`);
            }
        } catch (error) {
            console.error('❌ Error handling MCP message:', error);
            this.sendMCPError(ws, message.id, -32603, 'Internal error');
        }
    }

    private async handleToolsList(ws: WebSocket, message: MCPMessage) {
        const tools = this.tools.map(tool => tool.schema);
        this.sendMCPResponse(ws, message.id, { tools });
    }

    private async handleToolCall(ws: WebSocket, message: MCPMessage) {
        const { name, arguments: args } = message.params;

        const tool = this.tools.find(t => t.schema.name === name);
        if (!tool) {
            this.sendMCPError(ws, message.id, -32602, `Tool not found: ${name}`);
            return;
        }

        try {
            const result = await tool.handle(this.context, args);
            this.sendMCPResponse(ws, message.id, result);
        } catch (error) {
            console.error(`❌ Tool ${name} execution failed:`, error);
            this.sendMCPError(ws, message.id, -32603, `Tool execution failed: ${error.message}`);
        }
    }

    private async handleResourcesList(ws: WebSocket, message: MCPMessage) {
        const resources = this.resources.map(resource => resource.schema);
        this.sendMCPResponse(ws, message.id, { resources });
    }

    private async handleResourceRead(ws: WebSocket, message: MCPMessage) {
        const { uri } = message.params;

        const resource = this.resources.find(r => r.schema.uri === uri);
        if (!resource) {
            this.sendMCPError(ws, message.id, -32602, `Resource not found: ${uri}`);
            return;
        }

        try {
            const contents = await resource.read(this.context, uri);
            this.sendMCPResponse(ws, message.id, { contents });
        } catch (error) {
            console.error(`❌ Resource ${uri} read failed:`, error);
            this.sendMCPError(ws, message.id, -32603, `Resource read failed: ${error.message}`);
        }
    }

    private sendMCPResponse(ws: WebSocket, id: number | string | undefined, result: any) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
        console.log('📤 Sending MCP response:', response);
        ws.send(JSON.stringify(response));
    }

    private sendMCPError(ws: WebSocket, id: number | string | undefined, code: number, message: string) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            error: { code, message }
        };
        console.log('📤 Sending MCP error:', response);
        ws.send(JSON.stringify(response));
    }

    async close() {
        console.log('🛑 Closing WebSocket MCP Server...');

        // Close all connections
        for (const ws of this.extensionConnections) {
            ws.close();
        }
        for (const ws of this.mcpConnections) {
            ws.close();
        }

        // Close the server
        if (this.wss) {
            this.wss.close();
        }

        // Close context
        await this.context.close();
    }

    getConnectionStats() {
        return {
            extensionConnections: this.extensionConnections.size,
            mcpConnections: this.mcpConnections.size,
            totalConnections: this.extensionConnections.size + this.mcpConnections.size
        };
    }
}