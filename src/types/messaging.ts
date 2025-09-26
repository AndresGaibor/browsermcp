export interface MessagePayload<T, K extends keyof T> {
  [key: string]: any;
}

export type MessageType<T> = keyof T;

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