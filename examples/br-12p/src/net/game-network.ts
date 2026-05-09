import type { NetworkMessage, MessageType } from './message-protocol';

/** br-12p 游戏网络层接口 — MockNetwork 和 WsGameNetwork 均实现此接口 */
export interface IGameNetwork {
  readonly isConnected: boolean;
  connect(): void;
  disconnect(): void;
  send(msg: NetworkMessage): void;
  on<K extends MessageType>(type: K, handler: (msg: NetworkMessage & { type: K }) => void): void;
  off<K extends MessageType>(type: K, handler: (msg: NetworkMessage & { type: K }) => void): void;
}
