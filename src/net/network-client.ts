import type { INetworkTransport } from './transport';

export interface NetworkClientOptions {
  broadcastRate?: number;
}

export class NetworkClient {
  private _transport: INetworkTransport;
  private _connected = false;
  private _interval: number;
  private _accumulator = 0;
  private _queue = new Map<string, unknown>();

  constructor(transport: INetworkTransport, options?: NetworkClientOptions) {
    this._transport = transport;
    this._interval = 1 / (options?.broadcastRate ?? 10);
  }

  connect(roomId: string): void {
    this._transport.connect(roomId);
    this._connected = true;
  }

  disconnect(): void {
    this._transport.disconnect();
    this._connected = false;
  }

  send(type: string, data: unknown): void {
    this._transport.send(type, data);
  }

  on(type: string, handler: (data: unknown) => void): void {
    this._transport.on(type, handler);
  }

  off(type: string, handler: (data: unknown) => void): void {
    this._transport.off(type, handler);
  }

  update(dt: number): void {
    this._accumulator += dt;
    if (this._accumulator >= this._interval) {
      this._accumulator -= this._interval;
      for (const [type, data] of this._queue) {
        this._transport.send(type, data);
      }
      this._queue.clear();
    }
  }

  get connected(): boolean { return this._connected; }
}
