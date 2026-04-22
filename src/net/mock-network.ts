import type { INetworkTransport } from './transport';

const _rooms = new Map<string, Set<MockNetwork>>();

export class MockNetwork implements INetworkTransport {
  private _roomId: string | null = null;
  private _listeners = new Map<string, Set<(data: unknown) => void>>();

  get connected(): boolean {
    if (this._roomId === null) return false;
    return _rooms.get(this._roomId)?.has(this) ?? false;
  }

  connect(roomId: string): void {
    this.disconnect();
    this._roomId = roomId;
    if (!_rooms.has(roomId)) _rooms.set(roomId, new Set());
    _rooms.get(roomId)!.add(this);
  }

  disconnect(): void {
    if (this._roomId !== null) {
      _rooms.get(this._roomId)?.delete(this);
    }
    this._roomId = null;
  }

  send(type: string, data: unknown): void {
    if (this._roomId === null) return;
    const room = _rooms.get(this._roomId);
    if (!room || !room.has(this)) return;
    for (const peer of room) {
      if (peer === this) continue;
      peer._deliver(type, data);
    }
  }

  on(type: string, handler: (data: unknown) => void): void {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type)!.add(handler);
  }

  off(type: string, handler: (data: unknown) => void): void {
    this._listeners.get(type)?.delete(handler);
  }

  _deliver(type: string, data: unknown): void {
    const handlers = this._listeners.get(type);
    if (!handlers) return;
    for (const h of handlers) h(data);
  }
}

export function createMockNetwork(): MockNetwork {
  return new MockNetwork();
}

export function resetMockNetwork(): void {
  _rooms.clear();
}
