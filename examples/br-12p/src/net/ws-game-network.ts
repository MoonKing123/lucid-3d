/**
 * ws-game-network.ts — 真 WebSocket 游戏网络适配器。
 * 使用引擎 WebSocketTransport，将 br-12p 消息协议适配到 IGameNetwork 接口。
 * 浏览器和 Node.js 24+ 均可用。
 */

import { WebSocketTransport } from '../../../../src/net/websocket-transport';
import type { IGameNetwork } from './game-network';
import type { NetworkMessage, MessageType } from './message-protocol';

const ROOM_ID = 'br-12p';

export class WsGameNetwork implements IGameNetwork {
  private readonly _transport: WebSocketTransport;
  private readonly _handlerMap = new Map<Function, (data: unknown) => void>();

  constructor(url: string) {
    this._transport = new WebSocketTransport({ url, reconnect: false });
  }

  get isConnected(): boolean {
    return this._transport.connected;
  }

  connect(): void {
    this._transport.connect(ROOM_ID);
  }

  disconnect(): void {
    this._transport.disconnect();
  }

  /** 发送游戏消息：以 msg.type 为消息类型，msg 整体为 data */
  send(msg: NetworkMessage): void {
    this._transport.send(msg.type, msg);
  }

  on<K extends MessageType>(type: K, handler: (msg: NetworkMessage & { type: K }) => void): void {
    const wrapped = (data: unknown) => handler(data as NetworkMessage & { type: K });
    this._handlerMap.set(handler, wrapped);
    this._transport.on(type, wrapped);
  }

  off<K extends MessageType>(type: K, handler: (msg: NetworkMessage & { type: K }) => void): void {
    const wrapped = this._handlerMap.get(handler);
    if (wrapped) {
      this._transport.off(type, wrapped);
      this._handlerMap.delete(handler);
    }
  }
}
