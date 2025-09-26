#!/usr/bin/env bun

// Simple connection test for Browser MCP
import { WebSocket } from 'ws';

class ConnectionTester {
    constructor() {
        this.serverUrl = 'ws://localhost:9234';
    }

    async testServerConnection() {
        console.log('🔍 Testing MCP server connection...');

        return new Promise((resolve) => {
            const ws = new WebSocket(this.serverUrl);
            const timeout = setTimeout(() => {
                console.log('❌ Server connection timeout');
                ws.close();
                resolve(false);
            }, 5000);

            ws.on('open', () => {
                console.log('✅ MCP server is running and accepting connections');
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            });

            ws.on('error', (error) => {
                console.log('❌ MCP server connection failed:', error.message);
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    async testMCPProtocol() {
        console.log('\n🔍 Testing MCP protocol...');

        return new Promise((resolve) => {
            const ws = new WebSocket(this.serverUrl);
            const timeout = setTimeout(() => {
                console.log('❌ MCP protocol test timeout');
                ws.close();
                resolve(false);
            }, 10000);

            ws.on('open', () => {
                console.log('📤 Sending tools/list request...');

                const message = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/list',
                    params: {}
                };

                ws.send(JSON.stringify(message));
            });

            ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    console.log('📨 Received response:', JSON.stringify(response, null, 2));

                    if (response.result && response.result.tools) {
                        console.log('✅ MCP protocol working correctly');
                        console.log('🛠️ Available tools:', response.result.tools.map(t => t.name));
                        clearTimeout(timeout);
                        ws.close();
                        resolve(true);
                    } else {
                        console.log('⚠️ Unexpected response format');
                        clearTimeout(timeout);
                        ws.close();
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ Error parsing response:', error.message);
                    clearTimeout(timeout);
                    ws.close();
                    resolve(false);
                }
            });

            ws.on('error', (error) => {
                console.log('❌ MCP protocol test failed:', error.message);
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    async runDiagnostics() {
        console.log('🧪 Browser MCP Connection Diagnostics\n');

        // Test 1: Basic server connection
        const serverOk = await this.testServerConnection();

        if (!serverOk) {
            console.log('\n💡 Troubleshooting tips:');
            console.log('   1. Make sure the MCP server is running: bun run start');
            console.log('   2. Check if port 9234 is available');
            console.log('   3. Verify no firewall blocking localhost connections');
            return false;
        }

        // Test 2: MCP protocol
        const protocolOk = await this.testMCPProtocol();

        if (!protocolOk) {
            console.log('\n💡 Troubleshooting tips:');
            console.log('   1. Server may not be implementing MCP protocol correctly');
            console.log('   2. Check server logs for errors');
            console.log('   3. Verify server is using correct MCP version');
            return false;
        }

        console.log('\n🎉 All tests passed! Server is ready for extension connection.');
        console.log('\nNext steps:');
        console.log('   1. Load the extension in Chrome (chrome://extensions/)');
        console.log('   2. Open the test page: file://' + process.cwd() + '/test/test-page.html');
        console.log('   3. Click the extension icon and press "Connect"');
        console.log('   4. Run: bun test/mcp-client-test.js');

        return true;
    }
}

// Run diagnostics
const tester = new ConnectionTester();
tester.runDiagnostics().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((error) => {
    console.error('💥 Diagnostics failed:', error);
    process.exit(1);
});