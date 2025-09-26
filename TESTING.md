# Browser MCP Testing Guide

This guide helps you test the Browser MCP extension and server functionality.

## Quick Start Testing

### 1. Test Server Connection
```bash
bun test-quick.js
```
This checks if the MCP server is running and accessible.

### 2. Start the Server
```bash
bun run start
```
Keep this running in a terminal window.

### 3. Load the Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `extension/` folder from this project
6. Pin the extension to your toolbar (click puzzle icon → pin)

### 4. Test Basic Functionality

1. Open the test page: `file://[PROJECT_PATH]/test/test-page.html`
2. Click the Browser MCP extension icon
3. Click "Connect" button
4. Status should show "Connected" with green dot

## Comprehensive Testing

### Automated Test Suite
```bash
bun test/run-tests.js
```
This runs a guided test that:
- Starts the MCP server
- Tests WebSocket connection
- Guides you through extension setup
- Runs comprehensive client tests

### Manual Client Tests
```bash
bun test/mcp-client-test.js
```
Simulates how an AI application would interact with Browser MCP.

### Connection Diagnostics
```bash
bun test/test-connection.js
```
Diagnoses connection issues between client and server.

## Test Scenarios

### Test Page Elements

The `test/test-page.html` includes:

- **Click Tests**: Various buttons to test clicking
- **Type Tests**: Input fields, textareas, different input types
- **Hover Tests**: Elements that respond to mouse hover
- **Select Tests**: Dropdown menus with different options
- **Navigation Tests**: Links and history navigation
- **Dynamic Elements**: Add/remove elements dynamically
- **Console Logging**: Generate different types of console messages

### Extension Functions to Test

1. **Connection Management**
   - Connect to server
   - Disconnect from server
   - Auto-reconnection on failures
   - Status indicators

2. **DOM Interactions**
   - Click elements by CSS selector
   - Type text into inputs
   - Hover over elements
   - Select dropdown options
   - Navigate to URLs
   - Take page snapshots

3. **Advanced Features**
   - Element finding by text content
   - XPath selectors
   - Console log retrieval
   - Error handling

## Debugging

### Extension Logs

1. **Background Script Logs**:
   - Go to `chrome://extensions/`
   - Find Browser MCP extension
   - Click "Service worker" (or inspect views)
   - Check Console tab

2. **Content Script Logs**:
   - Open test page
   - Press F12 → Console tab
   - Look for `[BrowserMCP Content]` messages

3. **Popup Logs**:
   - Right-click extension icon
   - "Inspect popup"
   - Check Console tab

### Server Logs

The MCP server outputs logs directly to the terminal where you ran `bun run start`.

### Common Issues

#### "Extension not detected"
- Make sure extension is loaded and enabled
- Check for errors in extension console
- Try reloading the extension

#### "Connection timeout"
- Verify MCP server is running (`bun run start`)
- Check port 9234 is not blocked
- Test with `bun test-quick.js`

#### "Element not found"
- Check CSS selectors are correct
- Use browser DevTools to verify selectors
- Try different selector strategies (ID, class, XPath)

#### "Action failed"
- Check content script console for detailed errors
- Verify page is fully loaded before actions
- Some pages may block automated interactions

## Test Results

### Expected Successful Test Output

```
🧪 Browser MCP Test Suite

✅ Connected to MCP server
✅ Available tools: snapshot, click, type, hover, navigate, select_option
🎯 Testing tool: snapshot...
✅ Tool call successful
🎯 Testing tool: click...
✅ Tool call successful
🎯 Testing tool: type...
✅ Tool call successful

🎉 All tests completed successfully!
```

### Performance Expectations

- **Connection Time**: < 2 seconds
- **Action Response**: < 500ms for simple actions
- **Snapshot Generation**: < 1 second for typical pages
- **Memory Usage**: < 10MB for extension

## Advanced Testing

### Testing with Real AI Applications

Once basic tests pass, you can test with actual MCP-compatible AI applications:

1. **Claude Desktop**: Configure MCP server in settings
2. **Cursor**: Add MCP server configuration
3. **VS Code**: Use MCP extension
4. **Custom Applications**: Use MCP SDK

### Load Testing

For high-volume testing:

```bash
# Run multiple concurrent client tests
for i in {1..5}; do
  bun test/mcp-client-test.js &
done
wait
```

### Browser Compatibility

The extension is designed for Chrome but should work in:
- Google Chrome (primary)
- Microsoft Edge (Chromium-based)
- Brave Browser
- Other Chromium-based browsers

## Troubleshooting

### Reset Extension State

1. Go to `chrome://extensions/`
2. Click "Remove" on Browser MCP
3. Reload the extension folder
4. Reconfigure settings if needed

### Clear Extension Data

```javascript
// Run in extension background console
chrome.storage.local.clear(() => {
  console.log('Extension storage cleared');
});
```

### Port Conflicts

If port 9234 is in use:

1. Check what's using the port: `lsof -i :9234`
2. Kill the process or change port in extension settings
3. Update server configuration if needed

## Contributing Test Cases

When adding new functionality:

1. Add test elements to `test/test-page.html`
2. Add test cases to `test/mcp-client-test.js`
3. Update this documentation
4. Verify all existing tests still pass