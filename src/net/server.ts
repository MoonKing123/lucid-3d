import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

export interface GameServerOptions {
  port: number;
  tickRate?: number;
  maxClientsPerRoom?: number;
}

export class GameServer {
  private _wss: WebSocketServer | null = null;
  private _clients = new Map<string, WebSocket>();
  private _clientRooms = new Map<string, string>();
  private _rooms = new Map<string, Set<string>>();

  private _joinHandlers: Array<(clientId: string, roomId: string) => void> = [];
  private _leaveHandlers: Array<(clientId: string, roomId: string) => void> = [];
  private _msgHandlers: Array<(clientId: string, type: string, data: unknown) => void> = [];

  constructor(private readonly options: GameServerOptions) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._wss = new WebSocketServer({ port: this.options.port });
      this._wss.once('listening', () => resolve());
      this._wss.once('error', reject);
      this._wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        this._handleConnection(ws, req);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const ws of this._clients.values()) ws.terminate();
      this._clients.clear();
      this._rooms.clear();
      this._clientRooms.clear();
      if (!this._wss) { resolve(); return; }
      this._wss.close(() => resolve());
      this._wss = null;
    });
  }

  broadcast(roomId: string, type: string, data: unknown): void {
    const room = this._rooms.get(roomId);
    if (!room) return;
    const msg = JSON.stringify({ type, data });
    for (const clientId of room) {
      const ws = this._clients.get(clientId);
      if (ws?.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  onClientJoin(handler: (clientId: string, roomId: string) => void): void {
    this._joinHandlers.push(handler);
  }

  onClientLeave(handler: (clientId: string, roomId: string) => void): void {
    this._leaveHandlers.push(handler);
  }

  onMessage(handler: (clientId: string, type: string, data: unknown) => void): void {
    this._msgHandlers.push(handler);
  }

  get clientCount(): number {
    return this._clients.size;
  }

  get rooms(): ReadonlyMap<string, ReadonlySet<string>> {
    return this._rooms;
  }

  private _handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url ?? '/', `ws://localhost:${this.options.port}`);
    const roomId = url.searchParams.get('room') ?? 'default';
    const clientId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    this._clients.set(clientId, ws);
    this._clientRooms.set(clientId, roomId);
    if (!this._rooms.has(roomId)) this._rooms.set(roomId, new Set());
    this._rooms.get(roomId)!.add(clientId);

    for (const h of this._joinHandlers) h(clientId, roomId);

    ws.on('message', (rawData: Buffer) => {
      try {
        const { type, data } = JSON.parse(rawData.toString()) as { type: string; data: unknown };
        for (const h of this._msgHandlers) h(clientId, type, data);
        const room = this._rooms.get(roomId);
        if (!room) return;
        const msg = JSON.stringify({ type, data });
        for (const peerId of room) {
          if (peerId === clientId) continue;
          const peer = this._clients.get(peerId);
          if (peer?.readyState === WebSocket.OPEN) peer.send(msg);
        }
      } catch {
        // 忽略格式错误的消息
      }
    });

    ws.on('close', () => {
      this._clients.delete(clientId);
      this._clientRooms.delete(clientId);
      this._rooms.get(roomId)?.delete(clientId);
      for (const h of this._leaveHandlers) h(clientId, roomId);
    });
  }
}
