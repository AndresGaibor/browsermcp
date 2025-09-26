import { WebSocket } from 'ws';

export interface MessagePayload<T, K extends keyof T> {
  [key: string]: any;
}

export type MessageType<T> = keyof T;

export interface SocketMessageMap {
  [key: string]: any;
}

export function createSocketMessageSender<T>(ws: WebSocket) {
  return {
    sendSocketMessage: async <K extends keyof T>(
      type: K,
      payload: MessagePayload<T, K>,
      options: { timeoutMs?: number } = {}
    ): Promise<any> => {
      const { timeoutMs = 30000 } = options;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, timeoutMs);

        const messageId = Math.random().toString(36).substr(2, 9);

        const message = {
          id: messageId,
          type,
          payload
        };

        try {
          ws.send(JSON.stringify(message));

          const handleMessage = (data: any) => {
            try {
              const response = JSON.parse(data.toString());
              if (response.id === messageId) {
                clearTimeout(timeout);
                ws.off('message', handleMessage);
                resolve(response.payload);
              }
            } catch (error) {
              // Ignore parse errors
            }
          };

          ws.on('message', handleMessage);

        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }
  };
}