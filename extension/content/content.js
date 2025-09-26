// Content script for Browser MCP extension
class MCPContentScript {
    constructor() {
        this.debugMode = true;
        this.log('🚀 MCPContentScript initializing on:', window.location.href);
        this.init();
    }

    log(message, ...args) {
        if (this.debugMode) {
            console.log(`[BrowserMCP Content] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        console.error(`[BrowserMCP Content] ${message}`, ...args);
    }

    init() {
        this.setupMessageListener();

        // Notify background that content script is ready
        chrome.runtime.sendMessage({
            type: 'CONTENT_SCRIPT_READY',
            url: window.location.href
        }).then(() => {
            this.log('✅ Notified background script of content script ready');
        }).catch((error) => {
            this.error('❌ Failed to notify background script:', error);
        });

        // Add page indicator
        this.addPageIndicator();
    }

    addPageIndicator() {
        // Add a small indicator to show the content script is loaded
        const indicator = document.createElement('div');
        indicator.id = 'browser-mcp-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #007bff;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        indicator.textContent = 'Browser MCP Ready';
        document.body.appendChild(indicator);

        // Remove after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);

        this.log('📍 Added page indicator');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.log('📨 Received message:', message.type, message);

            if (message.type === 'EXECUTE_ACTION') {
                this.log('🎯 Executing action:', message.action, message.params);
                this.executeAction(message.action, message.params)
                    .then(result => {
                        this.log('✅ Action completed:', message.action, result);
                        sendResponse(result);
                    })
                    .catch(error => {
                        this.error('❌ Action failed:', message.action, error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Keep message channel open for async response
            }
        });
    }

    async executeAction(action, params) {
        try {
            switch (action) {
                case 'click':
                    return await this.click(params);
                case 'type':
                    return await this.type(params);
                case 'hover':
                    return await this.hover(params);
                case 'scroll':
                    return await this.scroll(params);
                case 'navigate':
                    return await this.navigate(params);
                case 'screenshot':
                    return await this.screenshot(params);
                case 'snapshot':
                    return await this.snapshot(params);
                case 'selectOption':
                    return await this.selectOption(params);
                case 'getAttribute':
                    return await this.getAttribute(params);
                case 'getText':
                    return await this.getText(params);
                case 'waitForElement':
                    return await this.waitForElement(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`Error executing ${action}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Element selection utilities
    findElement(selector) {
        this.log('🔍 Finding element with selector:', selector);

        try {
            let element = null;

            if (typeof selector === 'string') {
                element = document.querySelector(selector);
                this.log('📍 CSS selector result:', element ? element.tagName : 'null');
            } else if (selector.xpath) {
                const result = document.evaluate(
                    selector.xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                element = result.singleNodeValue;
                this.log('📍 XPath selector result:', element ? element.tagName : 'null');
            } else if (selector.text) {
                // Find element by text content
                const elements = Array.from(document.querySelectorAll('*'));
                element = elements.find(el =>
                    el.textContent.trim() === selector.text.trim() &&
                    el.children.length === 0
                );
                this.log('📍 Text selector result:', element ? element.tagName : 'null');
            } else {
                throw new Error('Invalid selector type');
            }

            if (element) {
                this.log('✅ Element found:', {
                    tagName: element.tagName,
                    id: element.id,
                    className: element.className,
                    textContent: element.textContent?.slice(0, 50)
                });
            } else {
                this.log('❌ Element not found');
            }

            return element;
        } catch (error) {
            this.error('❌ Error finding element:', error);
            throw error;
        }
    }

    // Action implementations
    async click(params) {
        const element = this.findElement(params.element || params.selector);
        if (!element) {
            throw new Error('Element not found');
        }

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait a bit for scrolling
        await this.wait(200);

        // Create and dispatch click event
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });

        element.dispatchEvent(clickEvent);

        // Also trigger focus if it's an input element
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.focus();
        }

        return {
            success: true,
            data: {
                tagName: element.tagName,
                text: element.textContent?.slice(0, 100)
            }
        };
    }

    async type(params) {
        const element = this.findElement(params.element || params.selector);
        if (!element) {
            throw new Error('Element not found');
        }

        element.focus();

        // Clear existing content if specified
        if (params.clear !== false) {
            element.value = '';
        }

        // Type the text
        const text = params.text || '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Update value
            element.value += char;

            // Dispatch input events
            element.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: char
            }));

            // Small delay between characters for more natural typing
            if (params.delay) {
                await this.wait(params.delay);
            }
        }

        // Dispatch change event
        element.dispatchEvent(new Event('change', { bubbles: true }));

        return {
            success: true,
            data: { value: element.value }
        };
    }

    async hover(params) {
        const element = this.findElement(params.element || params.selector);
        if (!element) {
            throw new Error('Element not found');
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const hoverEvent = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            view: window
        });

        element.dispatchEvent(hoverEvent);

        return { success: true };
    }

    async scroll(params) {
        const options = {
            top: params.y || 0,
            left: params.x || 0,
            behavior: params.smooth ? 'smooth' : 'auto'
        };

        if (params.element) {
            const element = this.findElement(params.element);
            if (element) {
                element.scrollIntoView({ behavior: options.behavior, block: 'center' });
            }
        } else {
            window.scrollTo(options);
        }

        return { success: true };
    }

    async navigate(params) {
        if (params.url) {
            window.location.href = params.url;
        } else if (params.direction === 'back') {
            window.history.back();
        } else if (params.direction === 'forward') {
            window.history.forward();
        } else if (params.direction === 'reload') {
            window.location.reload();
        }

        return { success: true };
    }

    async screenshot(params) {
        // Content scripts can't take screenshots directly
        // This would need to be handled by the background script
        throw new Error('Screenshot functionality requires background script');
    }

    async snapshot(params) {
        const snapshot = this.generateAriaSnapshot();
        return { success: true, data: snapshot };
    }

    generateAriaSnapshot() {
        const getElementInfo = (element) => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 &&
                             window.getComputedStyle(element).visibility !== 'hidden';

            return {
                tagName: element.tagName.toLowerCase(),
                text: element.textContent?.trim().slice(0, 100) || '',
                role: element.getAttribute('role') || '',
                ariaLabel: element.getAttribute('aria-label') || '',
                id: element.id || '',
                className: element.className || '',
                type: element.type || '',
                value: element.value || '',
                href: element.href || '',
                visible: isVisible,
                clickable: this.isClickable(element),
                rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                }
            };
        };

        const isClickable = (element) => {
            const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
            return clickableTags.includes(element.tagName) ||
                   element.onclick !== null ||
                   element.getAttribute('role') === 'button';
        };

        // Get all interactive elements
        const interactiveElements = Array.from(
            document.querySelectorAll(
                'a, button, input, select, textarea, [role="button"], [onclick], [tabindex]'
            )
        ).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }).map(getElementInfo);

        return {
            url: window.location.href,
            title: document.title,
            elements: interactiveElements,
            timestamp: Date.now()
        };
    }

    isClickable(element) {
        const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        return clickableTags.includes(element.tagName) ||
               element.onclick !== null ||
               element.getAttribute('role') === 'button' ||
               window.getComputedStyle(element).cursor === 'pointer';
    }

    async selectOption(params) {
        const select = this.findElement(params.element || params.selector);
        if (!select || select.tagName !== 'SELECT') {
            throw new Error('Select element not found');
        }

        let option;
        if (params.value !== undefined) {
            option = select.querySelector(`option[value="${params.value}"]`);
        } else if (params.text !== undefined) {
            option = Array.from(select.options).find(opt =>
                opt.textContent.trim() === params.text.trim()
            );
        } else if (params.index !== undefined) {
            option = select.options[params.index];
        }

        if (!option) {
            throw new Error('Option not found');
        }

        option.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return {
            success: true,
            data: {
                value: option.value,
                text: option.textContent
            }
        };
    }

    async getAttribute(params) {
        const element = this.findElement(params.element || params.selector);
        if (!element) {
            throw new Error('Element not found');
        }

        const value = element.getAttribute(params.attribute);
        return { success: true, data: { value } };
    }

    async getText(params) {
        const element = this.findElement(params.element || params.selector);
        if (!element) {
            throw new Error('Element not found');
        }

        const text = element.textContent || element.innerText || '';
        return { success: true, data: { text: text.trim() } };
    }

    async waitForElement(params) {
        const timeout = params.timeout || 5000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const element = this.findElement(params.element || params.selector);
                if (element) {
                    return { success: true, data: { found: true } };
                }
            } catch (error) {
                // Continue waiting
            }

            await this.wait(100);
        }

        throw new Error(`Element not found within ${timeout}ms`);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize content script
const mcpContent = new MCPContentScript();