#!/usr/bin/env bun

// MCP Client Test Script
// This script simulates how an AI application would connect to the Browser MCP server

import { WebSocket } from 'ws';

class MCPClientTest {
    constructor(serverUrl = 'ws://localhost:9234') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.connected = false;
    }

    async connect() {
        console.log(`🔌 Connecting to MCP server at ${this.serverUrl}...`);

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.on('open', () => {
                console.log('✅ Connected to MCP server');
                this.connected = true;
                this.setupMessageHandlers();
                resolve();
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket connection error:', error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 Connection closed');
                this.connected = false;
            });
        });
    }

    setupMessageHandlers() {
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received:', JSON.stringify(message, null, 2));

                if (message.id && this.pendingRequests.has(message.id)) {
                    const { resolve } = this.pendingRequests.get(message.id);
                    this.pendingRequests.delete(message.id);
                    resolve(message);
                }
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        });
    }

    async sendRequest(method, params = {}) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }

        const messageId = ++this.messageId;
        const message = {
            jsonrpc: '2.0',
            id: messageId,
            method: method,
            params: params
        };

        console.log(`📤 Sending: ${method}`, params);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(messageId, { resolve, reject });

            this.ws.send(JSON.stringify(message));

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    reject(new Error(`Request timeout for ${method}`));
                }
            }, 30000);
        });
    }

    async testListTools() {
        console.log('\n🛠️  Testing tools/list...');
        try {
            const response = await this.sendRequest('tools/list');
            console.log('✅ Available tools:', response.result?.tools?.map(t => t.name) || []);
            return response.result?.tools || [];
        } catch (error) {
            console.error('❌ Failed to list tools:', error.message);
            return [];
        }
    }

    async testToolCall(toolName, args = {}) {
        console.log(`\n🎯 Testing tool: ${toolName}...`);
        try {
            const response = await this.sendRequest('tools/call', {
                name: toolName,
                arguments: args
            });

            if (response.error) {
                console.error(`❌ Tool call failed:`, response.error);
                return false;
            }

            console.log('✅ Tool call successful:', response.result);
            return true;
        } catch (error) {
            console.error(`❌ Tool call error:`, error.message);
            return false;
        }
    }

    async runTestSuite() {
        console.log('🧪 Starting Browser MCP Test Suite\n');

        try {
            // Connect to server
            await this.connect();

            // Wait a moment for extension to potentially connect
            console.log('⏳ Waiting for extension connection...');
            await this.wait(2000);

            // Test 1: List available tools
            const tools = await this.testListTools();

            if (tools.length === 0) {
                console.log('⚠️  No tools available. Make sure the extension is connected.');
                return;
            }

            // Test 2: Take a snapshot
            if (tools.find(t => t.name === 'snapshot')) {
                await this.testToolCall('snapshot', {});
            }

            // Test 3: Navigate (if available)
            if (tools.find(t => t.name === 'navigate')) {
                await this.testToolCall('navigate', {
                    url: 'file://' + process.cwd() + '/test/test-page.html'
                });
                await this.wait(2000);
            }

            // Test 4: Click test
            if (tools.find(t => t.name === 'click')) {
                await this.testToolCall('click', {
                    element: '#click-test-1'
                });
                await this.wait(1000);
            }

            // Test 5: Type test
            if (tools.find(t => t.name === 'type')) {
                await this.testToolCall('type', {
                    element: '#text-input',
                    text: 'Hello from MCP test!'
                });
                await this.wait(1000);
            }

            // Test 6: Hover test
            if (tools.find(t => t.name === 'hover')) {
                await this.testToolCall('hover', {
                    element: '#hover-target'
                });
                await this.wait(1000);
            }

            // Test 7: Select option test
            if (tools.find(t => t.name === 'select_option')) {
                await this.testToolCall('select_option', {
                    element: '#country-select',
                    value: 'us'
                });
                await this.wait(1000);
            }

            // Test 8: Get console logs (if available)
            if (tools.find(t => t.name === 'get_console_logs')) {
                await this.testToolCall('get_console_logs', {});
            }

            // Test 9: Take another snapshot to see changes
            if (tools.find(t => t.name === 'snapshot')) {
                console.log('\n📸 Taking final snapshot...');
                await this.testToolCall('snapshot', {});
            }

            console.log('\n🎉 Test suite completed!');

        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Interactive test mode
async function interactiveTest() {
    const client = new MCPClientTest();

    try {
        await client.connect();

        console.log('\n🎮 Interactive Test Mode');
        console.log('Available commands:');
        console.log('  tools - List available tools');
        console.log('  click <selector> - Click element');
        console.log('  type <selector> <text> - Type text');
        console.log('  navigate <url> - Navigate to URL');
        console.log('  snapshot - Take page snapshot');
        console.log('  quit - Exit');

        // Simple command loop (for demonstration)
        // In real usage, you'd integrate this with a proper CLI library

    } catch (error) {
        console.error('Failed to start interactive mode:', error.message);
    }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
    interactiveTest();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Browser MCP Client Test

Usage:
  bun test/mcp-client-test.js [options]

Options:
  --interactive, -i    Start interactive test mode
  --help, -h          Show this help message

Examples:
  bun test/mcp-client-test.js           # Run full test suite
  bun test/mcp-client-test.js -i       # Interactive mode
`);
} else {
    // Run full test suite
    const client = new MCPClientTest();
    client.runTestSuite().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

export { MCPClientTest };