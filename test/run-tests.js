#!/usr/bin/env bun

// Complete test suite for Browser MCP
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { WebSocket } from 'ws';

class BrowserMCPTestSuite {
    constructor() {
        this.serverProcess = null;
        this.serverUrl = 'ws://localhost:9234';
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startServer() {
        console.log('🚀 Starting MCP server...');

        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('bun', ['run', 'start'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let output = '';

            this.serverProcess.stdout.on('data', (data) => {
                output += data.toString();
                console.log('Server:', data.toString().trim());
            });

            this.serverProcess.stderr.on('data', (data) => {
                output += data.toString();
                console.log('Server Error:', data.toString().trim());
            });

            this.serverProcess.on('error', (error) => {
                console.error('❌ Failed to start server:', error.message);
                reject(error);
            });

            // Give server time to start
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    console.log('✅ Server started');
                    resolve();
                } else {
                    reject(new Error('Server failed to start'));
                }
            }, 3000);
        });
    }

    async stopServer() {
        if (this.serverProcess) {
            console.log('🛑 Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    async testServerConnection() {
        console.log('\n🔍 Testing server connection...');

        for (let i = 0; i < 5; i++) {
            try {
                const ws = new WebSocket(this.serverUrl);

                const connected = await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(false), 2000);

                    ws.on('open', () => {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(true);
                    });

                    ws.on('error', () => {
                        clearTimeout(timeout);
                        resolve(false);
                    });
                });

                if (connected) {
                    console.log('✅ Server connection successful');
                    return true;
                }
            } catch (error) {
                // Continue trying
            }

            console.log(`⏳ Attempt ${i + 1}/5 failed, retrying...`);
            await this.wait(1000);
        }

        console.log('❌ Server connection failed after 5 attempts');
        return false;
    }

    async testMCPProtocol() {
        console.log('\n🔍 Testing MCP protocol...');

        return new Promise((resolve) => {
            const ws = new WebSocket(this.serverUrl);
            const timeout = setTimeout(() => {
                ws.close();
                resolve(false);
            }, 5000);

            ws.on('open', () => {
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

                    if (response.result && response.result.tools) {
                        console.log('✅ MCP protocol working');
                        console.log('🛠️ Available tools:', response.result.tools.map(t => t.name).join(', '));
                        clearTimeout(timeout);
                        ws.close();
                        resolve(true);
                    } else {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(false);
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    ws.close();
                    resolve(false);
                }
            });

            ws.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    displayExtensionInstructions() {
        console.log('\n📋 Manual Extension Setup Required:');
        console.log('   1. Open Chrome and go to: chrome://extensions/');
        console.log('   2. Enable "Developer mode" (top right)');
        console.log('   3. Click "Load unpacked"');
        console.log('   4. Select folder: ' + process.cwd() + '/extension');
        console.log('   5. The extension should appear in your toolbar');
        console.log('\n📄 Test Page Setup:');
        console.log('   1. Open new tab in Chrome');
        console.log('   2. Navigate to: file://' + process.cwd() + '/test/test-page.html');
        console.log('   3. Click the Browser MCP extension icon');
        console.log('   4. Click "Connect" button');
        console.log('   5. Status should show "Connected" with green dot');

        console.log('\n⏳ Waiting 30 seconds for manual setup...');
        console.log('   (Press Ctrl+C to skip manual setup)');
    }

    async waitForExtensionConnection() {
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds

        while (Date.now() - startTime < timeout) {
            try {
                // Try to detect if extension connected by sending a test message
                const ws = new WebSocket(this.serverUrl);

                const hasConnection = await new Promise((resolve) => {
                    const messageTimeout = setTimeout(() => {
                        ws.close();
                        resolve(false);
                    }, 1000);

                    ws.on('open', () => {
                        // Send a ping to see if extension responds
                        ws.send(JSON.stringify({
                            type: 'ping',
                            timestamp: Date.now()
                        }));
                    });

                    ws.on('message', (data) => {
                        clearTimeout(messageTimeout);
                        ws.close();
                        resolve(true);
                    });

                    ws.on('error', () => {
                        clearTimeout(messageTimeout);
                        resolve(false);
                    });
                });

                if (hasConnection) {
                    console.log('✅ Extension connection detected!');
                    return true;
                }
            } catch (error) {
                // Continue waiting
            }

            process.stdout.write('.');
            await this.wait(1000);
        }

        console.log('\n⚠️ Extension connection not detected (continuing anyway)');
        return false;
    }

    async runClientTests() {
        console.log('\n🧪 Running client tests...');

        return new Promise((resolve) => {
            const testProcess = spawn('bun', ['test/mcp-client-test.js'], {
                stdio: 'inherit',
                cwd: process.cwd()
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Client tests passed');
                    resolve(true);
                } else {
                    console.log('❌ Client tests failed');
                    resolve(false);
                }
            });

            testProcess.on('error', (error) => {
                console.error('❌ Error running client tests:', error.message);
                resolve(false);
            });
        });
    }

    async runFullTestSuite() {
        console.log('🎯 Browser MCP Full Test Suite\n');

        try {
            // Step 1: Start server
            await this.startServer();

            // Step 2: Test server connection
            const serverOk = await this.testServerConnection();
            if (!serverOk) {
                console.log('❌ Server tests failed');
                return false;
            }

            // Step 3: Test MCP protocol
            const protocolOk = await this.testMCPProtocol();
            if (!protocolOk) {
                console.log('❌ Protocol tests failed');
                return false;
            }

            // Step 4: Extension setup (manual)
            this.displayExtensionInstructions();

            // Step 5: Wait for extension connection
            await this.waitForExtensionConnection();

            // Step 6: Run comprehensive client tests
            const clientOk = await this.runClientTests();

            if (clientOk) {
                console.log('\n🎉 All tests completed successfully!');
                console.log('\nYour Browser MCP setup is working correctly.');
                return true;
            } else {
                console.log('\n⚠️ Some tests failed, but basic functionality is working.');
                return false;
            }

        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
            return false;
        } finally {
            await this.stopServer();
        }
    }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🛑 Test suite interrupted');
    process.exit(0);
});

// Run the test suite
const testSuite = new BrowserMCPTestSuite();
testSuite.runFullTestSuite().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((error) => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});