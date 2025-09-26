// Options page script for Browser MCP extension
class OptionsController {
    constructor() {
        this.form = document.getElementById('settingsForm');
        this.resetBtn = document.getElementById('resetBtn');
        this.testConnectionBtn = document.getElementById('testConnectionBtn');
        this.toggleTokenBtn = document.getElementById('toggleToken');
        this.status = document.getElementById('status');

        this.defaultSettings = {
            port: 9234,
            token: '',
            reconnectAttempts: 5,
            autoConnect: false,
            debugMode: false
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSave(e));
        this.resetBtn.addEventListener('click', () => this.handleReset());
        this.testConnectionBtn.addEventListener('click', () => this.handleTestConnection());
        this.toggleTokenBtn.addEventListener('click', () => this.toggleTokenVisibility());

        // Auto-save on change for some fields
        const autoSaveFields = ['autoConnect', 'debugMode'];
        autoSaveFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.addEventListener('change', () => this.autoSave());
            }
        });

        // Validate port input
        const portInput = document.getElementById('port');
        portInput.addEventListener('input', () => this.validatePort());
    }

    async loadSettings() {
        try {
            const settings = await this.getStoredSettings();
            this.populateForm(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }

    getStoredSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(Object.keys(this.defaultSettings), (result) => {
                // Merge with defaults
                const settings = { ...this.defaultSettings, ...result };
                resolve(settings);
            });
        });
    }

    populateForm(settings) {
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
    }

    async handleSave(event) {
        event.preventDefault();

        try {
            const formData = new FormData(this.form);
            const settings = {};

            // Process form data
            for (const [key, value] of formData.entries()) {
                const element = document.getElementById(key);
                if (element.type === 'checkbox') {
                    settings[key] = element.checked;
                } else if (element.type === 'number') {
                    settings[key] = parseInt(value) || this.defaultSettings[key];
                } else {
                    settings[key] = value;
                }
            }

            // Validate settings
            const validation = this.validateSettings(settings);
            if (!validation.valid) {
                this.showStatus(validation.error, 'error');
                return;
            }

            // Save to storage
            await this.saveSettings(settings);
            this.showStatus('Settings saved successfully!', 'success');

            // Notify background script of settings change
            chrome.runtime.sendMessage({
                type: 'SETTINGS_UPDATED',
                settings: settings
            }).catch(() => {
                // Ignore if no listeners
            });

        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }

    saveSettings(settings) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(settings, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    validateSettings(settings) {
        // Validate port
        const port = parseInt(settings.port);
        if (isNaN(port) || port < 1 || port > 65535) {
            return { valid: false, error: 'Port must be between 1 and 65535' };
        }

        // Validate token length
        if (settings.token && settings.token.length > 64) {
            return { valid: false, error: 'Token must be 64 characters or less' };
        }

        // Validate reconnect attempts
        const attempts = parseInt(settings.reconnectAttempts);
        if (isNaN(attempts) || attempts < 0 || attempts > 10) {
            return { valid: false, error: 'Reconnect attempts must be between 0 and 10' };
        }

        return { valid: true };
    }

    validatePort() {
        const portInput = document.getElementById('port');
        const port = parseInt(portInput.value);

        if (isNaN(port) || port < 1 || port > 65535) {
            portInput.setCustomValidity('Port must be between 1 and 65535');
        } else {
            portInput.setCustomValidity('');
        }
    }

    async handleReset() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            try {
                await this.saveSettings(this.defaultSettings);
                this.populateForm(this.defaultSettings);
                this.showStatus('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showStatus('Error resetting settings', 'error');
            }
        }
    }

    async handleTestConnection() {
        const button = this.testConnectionBtn;
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = 'Testing...';

            const settings = await this.getFormSettings();
            const result = await this.testConnection(settings.port);

            if (result.success) {
                this.showStatus('Connection test successful!', 'success');
            } else {
                this.showStatus(`Connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            this.showStatus('Connection test failed', 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    getFormSettings() {
        const formData = new FormData(this.form);
        const settings = {};

        for (const [key, value] of formData.entries()) {
            const element = document.getElementById(key);
            if (element.type === 'checkbox') {
                settings[key] = element.checked;
            } else if (element.type === 'number') {
                settings[key] = parseInt(value) || this.defaultSettings[key];
            } else {
                settings[key] = value;
            }
        }

        return settings;
    }

    testConnection(port) {
        return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:${port}`);
            const timeout = setTimeout(() => {
                ws.close();
                resolve({ success: false, error: 'Connection timeout' });
            }, 5000);

            ws.onopen = () => {
                clearTimeout(timeout);
                ws.close();
                resolve({ success: true });
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                resolve({ success: false, error: 'Connection failed' });
            };
        });
    }

    toggleTokenVisibility() {
        const tokenInput = document.getElementById('token');
        const toggleBtn = this.toggleTokenBtn;

        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            tokenInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    async autoSave() {
        try {
            const settings = this.getFormSettings();
            await this.saveSettings(settings);
            this.showStatus('Settings auto-saved', 'info', 2000);
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    showStatus(message, type = 'info', timeout = 5000) {
        const statusDiv = this.status;
        const statusText = statusDiv.querySelector('.status-text');

        statusText.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');

        if (timeout > 0) {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, timeout);
        }
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
});