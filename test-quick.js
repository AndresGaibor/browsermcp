#!/usr/bin/env bun

// Quick test script for Browser MCP
console.log('🚀 Browser MCP Quick Test\n');

console.log('Step 1: Testing connection to MCP server...');

import { WebSocket } from 'ws';

const testConnection = async () => {
    try {
        const ws = new WebSocket('ws://localhost:9234');

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('✅ Server connection successful!');
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        console.log('\n🎉 Server is ready!');
        console.log('\nNext steps:');
        console.log('1. Load extension in Chrome:');
        console.log('   - Go to chrome://extensions/');
        console.log('   - Enable "Developer mode"');
        console.log('   - Click "Load unpacked"');
        console.log('   - Select: ' + process.cwd() + '/extension');
        console.log('\n2. Open test page:');
        console.log('   - New tab: file://' + process.cwd() + '/test/test-page.html');
        console.log('   - Click extension icon → "Connect"');
        console.log('\n3. Run full tests:');
        console.log('   - bun test/mcp-client-test.js');
        console.log('   - bun test/run-tests.js (guided setup)');
        console.log('\n4. Check logs:');
        console.log('   - Background script: chrome://extensions/ → Service worker');
        console.log('   - Content script: F12 → Console on test page');

    } catch (error) {
        console.log('❌ Server connection failed:', error.message);
        console.log('\n💡 Make sure server is running:');
        console.log('   bun run start');
        console.log('\n💡 If server is running, check:');
        console.log('   - Port 9234 is not blocked');
        console.log('   - No firewall issues');
        console.log('   - Server logs for errors');
    }
};

testConnection();