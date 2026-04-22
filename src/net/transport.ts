export const __STUB__ = true;

export interface INetworkTransport {
  send(type: string, data: unknown): void;
  on(type: string, handler: (data: unknown) => void): void;
  off(type: string, handler: (data: unknown) => void): void;
  connect(roomId: string): void;
  disconnect(): void;
  readonly connected: boolean;
}
