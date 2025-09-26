// Background service worker for Browser MCP extension
class MCPBackgroundService {
    constructor() {
        this.ws = null;
        this.connectedTabId = null;
        this.connectionStatus = false;
        this.settings = { port: 9234, token: '' };
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.debugMode = true; // Enable debug logging

        this.log('🚀 MCPBackgroundService initializing...');
        this.init();
    }

    log(message, ...args) {
        if (this.debugMode) {
            console.log(`[BrowserMCP Background] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        console.error(`[BrowserMCP Background] ${message}`, ...args);
    }

    async init() {
        await this.loadSettings();
        this.setupMessageListeners();
        this.setupTabListeners();
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['port', 'token', 'debugMode'], (result) => {
                this.settings = {
                    port: result.port || 9234,
                    token: result.token || ''
                };
                this.debugMode = result.debugMode !== false; // Default to true
                this.log('⚙️ Settings loaded:', this.settings);
                resolve();
            });
        });
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Listen for settings changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.port) this.settings.port = changes.port.newValue || 9234;
                if (changes.token) this.settings.token = changes.token.newValue || '';
            }
        });
    }

    setupTabListeners() {
        // Disconnect when connected tab is closed
        chrome.tabs.onRemoved.addListener((tabId) => {
            if (tabId === this.connectedTabId) {
                this.disconnect();
            }
        });

        // Disconnect when navigating away from connected tab
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (tabId === this.connectedTabId && changeInfo.status === 'loading') {
                // Optionally keep connection on navigation - uncomment next line to disconnect
                // this.disconnect();
            }
        });
    }

    async handleMessage(message, sender, sendResponse) {
        this.log('📨 Received message:', message.type, message);

        try {
            switch (message.type) {
                case 'GET_CONNECTION_STATUS':
                    const status = {
                        connected: this.connectionStatus,
                        port: this.settings.port,
                        tabId: this.connectedTabId
                    };
                    this.log('📊 Connection status requested:', status);
                    sendResponse(status);
                    break;

                case 'CONNECT_TO_SERVER':
                    this.log('🔌 Connect request for tab:', message.tabId);
                    const connectResult = await this.connect(message.tabId);
                    this.log('🔌 Connect result:', connectResult);
                    sendResponse(connectResult);
                    break;

                case 'DISCONNECT_FROM_SERVER':
                    this.log('🔌 Disconnect request');
                    const disconnectResult = await this.disconnect();
                    this.log('🔌 Disconnect result:', disconnectResult);
                    sendResponse(disconnectResult);
                    break;

                case 'EXECUTE_ACTION':
                    this.log('🎯 Execute action:', message.action, message.params);
                    const actionResult = await this.executeAction(message.action, message.params);
                    this.log('🎯 Action result:', actionResult);
                    sendResponse(actionResult);
                    break;

                default:
                    this.error('❌ Unknown message type:', message.type);
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            this.error('❌ Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async connect(tabId) {
        try {
            this.log('🔌 Starting connection process for tab:', tabId);

            if (this.connectionStatus) {
                this.log('⚠️ Already connected, rejecting new connection');
                return { success: false, error: 'Already connected' };
            }

            this.connectedTabId = tabId;

            // Create WebSocket connection to MCP server
            const wsUrl = `ws://localhost:${this.settings.port}`;
            this.log('🌐 Creating WebSocket connection to:', wsUrl);
            this.ws = new WebSocket(wsUrl);

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    this.error('⏰ Connection timeout after 10 seconds');
                    resolve({ success: false, error: 'Connection timeout' });
                }, 10000);

                this.ws.onopen = () => {
                    this.log('✅ WebSocket connection opened');
                    clearTimeout(timeout);
                    this.connectionStatus = true;
                    this.reconnectAttempts = 0;

                    // Send authentication if token is provided
                    if (this.settings.token) {
                        this.log('🔐 Sending authentication token');
                        this.ws.send(JSON.stringify({
                            type: 'auth',
                            token: this.settings.token
                        }));
                    }

                    // Send extension capabilities
                    this.log('📋 Sending extension capabilities');
                    this.ws.send(JSON.stringify({
                        type: 'capabilities',
                        data: {
                            name: 'Browser MCP Extension',
                            version: '1.0.0',
                            features: ['dom-interaction', 'navigation', 'screenshots']
                        }
                    }));

                    this.broadcastStatusChange();
                    this.log('🎉 Connection established successfully');
                    resolve({ success: true });
                };

                this.ws.onerror = (error) => {
                    this.error('❌ WebSocket error:', error);
                    clearTimeout(timeout);
                    resolve({ success: false, error: 'Failed to connect to MCP server' });
                };

                this.ws.onclose = () => {
                    this.log('🔌 WebSocket connection closed');
                    this.handleDisconnection();
                };

                this.ws.onmessage = (event) => {
                    this.log('📨 Received server message:', event.data);
                    this.handleServerMessage(event.data);
                };
            });
        } catch (error) {
            this.error('❌ Connection error:', error);
            return { success: false, error: error.message };
        }
    }

    async disconnect() {
        try {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            this.connectionStatus = false;
            this.connectedTabId = null;
            this.reconnectAttempts = 0;

            this.broadcastStatusChange();

            return { success: true };
        } catch (error) {
            console.error('Disconnect error:', error);
            return { success: false, error: error.message };
        }
    }

    handleDisconnection() {
        this.connectionStatus = false;
        this.broadcastStatusChange();

        // Attempt reconnection if it was unexpected
        if (this.connectedTabId && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect(this.connectedTabId);
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    async handleServerMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'execute':
                    await this.executeAction(message.action, message.params);
                    break;

                case 'ping':
                    this.ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                default:
                    console.log('Unknown server message:', message);
            }
        } catch (error) {
            console.error('Error parsing server message:', error);
        }
    }

    async executeAction(action, params) {
        if (!this.connectedTabId) {
            return { success: false, error: 'No connected tab' };
        }

        try {
            // Send action to content script
            const response = await chrome.tabs.sendMessage(this.connectedTabId, {
                type: 'EXECUTE_ACTION',
                action: action,
                params: params
            });

            // Send result back to server if connected
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'action_result',
                    action: action,
                    success: response.success,
                    data: response.data,
                    error: response.error
                }));
            }

            return response;
        } catch (error) {
            console.error('Error executing action:', error);
            const errorResponse = { success: false, error: error.message };

            // Send error back to server
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'action_result',
                    action: action,
                    success: false,
                    error: error.message
                }));
            }

            return errorResponse;
        }
    }

    broadcastStatusChange() {
        // Notify popup and other parts of the extension
        chrome.runtime.sendMessage({
            type: 'CONNECTION_STATUS_CHANGED',
            connected: this.connectionStatus,
            port: this.settings.port,
            tabId: this.connectedTabId
        }).catch(() => {
            // Ignore errors if no listeners
        });
    }
}

// Initialize the background service
const mcpService = new MCPBackgroundService();