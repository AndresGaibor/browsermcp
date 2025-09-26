// Popup script for Browser MCP extension
class PopupController {
    constructor() {
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.serverInfo = document.getElementById('serverInfo');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.optionsLink = document.getElementById('optionsLink');

        this.init();
    }

    async init() {
        await this.updateUI();
        this.setupEventListeners();

        // Listen for status changes from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'CONNECTION_STATUS_CHANGED') {
                this.updateConnectionStatus(message.connected, message.port);
            }
        });
    }

    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.handleConnect());
        this.disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        this.optionsLink.addEventListener('click', () => this.openOptions());
    }

    async updateUI() {
        try {
            // Get current connection status from background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_CONNECTION_STATUS'
            });

            if (response) {
                this.updateConnectionStatus(response.connected, response.port);
            }

            // Get settings for server info
            const settings = await this.getSettings();
            this.serverInfo.textContent = `Port: ${settings.port}`;
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['port', 'token'], (result) => {
                resolve({
                    port: result.port || 9234,
                    token: result.token || ''
                });
            });
        });
    }

    updateConnectionStatus(connected, port) {
        if (connected) {
            this.statusDot.classList.add('connected');
            this.statusText.textContent = 'Connected';
            this.connectBtn.classList.add('hidden');
            this.disconnectBtn.classList.remove('hidden');
        } else {
            this.statusDot.classList.remove('connected');
            this.statusText.textContent = 'Disconnected';
            this.connectBtn.classList.remove('hidden');
            this.disconnectBtn.classList.add('hidden');
        }

        if (port) {
            this.serverInfo.textContent = `Port: ${port}`;
        }
    }

    async handleConnect() {
        try {
            this.connectBtn.disabled = true;
            this.connectBtn.classList.add('loading');
            this.statusText.textContent = 'Connecting...';

            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send connect request to background script
            const response = await chrome.runtime.sendMessage({
                type: 'CONNECT_TO_SERVER',
                tabId: tab.id
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to connect');
            }

            // UI will be updated via message listener
        } catch (error) {
            console.error('Connection failed:', error);
            this.statusText.textContent = 'Connection failed';
            this.showError(error.message);
        } finally {
            this.connectBtn.disabled = false;
            this.connectBtn.classList.remove('loading');
        }
    }

    async handleDisconnect() {
        try {
            this.disconnectBtn.disabled = true;
            this.statusText.textContent = 'Disconnecting...';

            const response = await chrome.runtime.sendMessage({
                type: 'DISCONNECT_FROM_SERVER'
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to disconnect');
            }

            // UI will be updated via message listener
        } catch (error) {
            console.error('Disconnect failed:', error);
            this.showError(error.message);
        } finally {
            this.disconnectBtn.disabled = false;
        }
    }

    openOptions() {
        chrome.runtime.openOptionsPage();
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper toast/notification
        const originalText = this.statusText.textContent;
        this.statusText.textContent = message;
        this.statusText.style.color = '#ef4444';

        setTimeout(() => {
            this.statusText.textContent = originalText;
            this.statusText.style.color = '';
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});