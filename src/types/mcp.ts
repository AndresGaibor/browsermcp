import { z } from "zod";

// Navigation tool types
export const NavigateTool = z.object({
  name: z.literal("navigate"),
  description: z.literal("Navigate to a URL or use browser history"),
  arguments: z.object({
    url: z.string().optional(),
    direction: z.enum(["back", "forward", "reload"]).optional()
  })
});

export const GoBackTool = z.object({
  name: z.literal("go_back"),
  description: z.literal("Navigate back in browser history"),
  arguments: z.object({})
});

export const GoForwardTool = z.object({
  name: z.literal("go_forward"),
  description: z.literal("Navigate forward in browser history"),
  arguments: z.object({})
});

// Interaction tool types
export const ClickTool = z.object({
  name: z.literal("click"),
  description: z.literal("Click on an element on the page"),
  arguments: z.object({
    element: z.string().describe("CSS selector, XPath, or element description")
  })
});

export const TypeTool = z.object({
  name: z.literal("type"),
  description: z.literal("Type text into an input field"),
  arguments: z.object({
    element: z.string().describe("CSS selector, XPath, or element description"),
    text: z.string().describe("Text to type"),
    clear: z.boolean().optional().describe("Clear field before typing (default: true)")
  })
});

export const HoverTool = z.object({
  name: z.literal("hover"),
  description: z.literal("Hover over an element"),
  arguments: z.object({
    element: z.string().describe("CSS selector, XPath, or element description")
  })
});

export const SelectOptionTool = z.object({
  name: z.literal("select_option"),
  description: z.literal("Select an option from a dropdown"),
  arguments: z.object({
    element: z.string().describe("CSS selector for the select element"),
    value: z.string().optional().describe("Option value to select"),
    text: z.string().optional().describe("Option text to select"),
    index: z.number().optional().describe("Option index to select")
  })
});

export const DragTool = z.object({
  name: z.literal("drag"),
  description: z.literal("Drag an element to another location"),
  arguments: z.object({
    startElement: z.string().describe("CSS selector for element to drag"),
    endElement: z.string().describe("CSS selector for drop target")
  })
});

// Utility tool types
export const SnapshotTool = z.object({
  name: z.literal("snapshot"),
  description: z.literal("Take a snapshot of the current page structure"),
  arguments: z.object({})
});

export const ScreenshotTool = z.object({
  name: z.literal("screenshot"),
  description: z.literal("Take a screenshot of the current page"),
  arguments: z.object({
    fullPage: z.boolean().optional().describe("Capture full page (default: false)")
  })
});

export const GetConsoleLogsTool = z.object({
  name: z.literal("get_console_logs"),
  description: z.literal("Get console logs from the current page"),
  arguments: z.object({
    level: z.enum(["log", "info", "warn", "error"]).optional().describe("Filter by log level")
  })
});

export const PressKeyTool = z.object({
  name: z.literal("press_key"),
  description: z.literal("Press a keyboard key"),
  arguments: z.object({
    key: z.string().describe("Key to press (e.g., 'Enter', 'Escape', 'ArrowDown')")
  })
});

export const WaitTool = z.object({
  name: z.literal("wait"),
  description: z.literal("Wait for a specified amount of time"),
  arguments: z.object({
    milliseconds: z.number().describe("Time to wait in milliseconds")
  })
});

// Socket message types
export interface SocketMessageMap {
  browser_click: { element: string };
  browser_type: { element: string; text: string; clear?: boolean };
  browser_hover: { element: string };
  browser_navigate: { url?: string; direction?: string };
  browser_snapshot: {};
  browser_screenshot: { fullPage?: boolean };
  browser_console_logs: { level?: string };
  browser_press_key: { key: string };
  browser_select_option: { element: string; value?: string; text?: string; index?: number };
}