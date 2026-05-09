import type { INetworkTransport } from './transport';

export interface WebSocketTransportOptions {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
}

export class WebSocketTransport implements INetworkTransport {
  private _ws: WebSocket | null = null;
  private _connected = false;
  private _listeners = new Map<string, Set<(data: unknown) => void>>();
  private _roomId: string | null = null;
  private _explicitDisconnect = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: WebSocketTransportOptions) {}

  get connected(): boolean {
    return this._connected;
  }

  connect(roomId: string): void {
    this._roomId = roomId;
    this._explicitDisconnect = false;
    this._openWS();
  }

  disconnect(): void {
    this._explicitDisconnect = true;
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      this._ws.onclose = null;
      this._ws.onopen = null;
      this._ws.onmessage = null;
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
  }

  send(type: string, data: unknown): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type, data }));
    }
  }

  on(type: string, handler: (data: unknown) => void): void {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type)!.add(handler);
  }

  off(type: string, handler: (data: unknown) => void): void {
    this._listeners.get(type)?.delete(handler);
  }

  private _openWS(): void {
    const url = this._roomId
      ? `${this.options.url}?room=${encodeURIComponent(this._roomId)}`
      : this.options.url;
    const ws = new WebSocket(url);
    this._ws = ws;

    ws.onopen = () => {
      this._connected = true;
    };

    ws.onclose = () => {
      this._connected = false;
      if (!this._explicitDisconnect && this.options.reconnect !== false) {
        this._reconnectTimer = setTimeout(
          () => this._openWS(),
          this.options.reconnectDelay ?? 1000
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data as string) as { type: string; data: unknown };
        const handlers = this._listeners.get(type);
        if (handlers) {
          for (const h of handlers) h(data);
        }
      } catch {
        // 忽略格式错误的消息
      }
    };
  }
}
