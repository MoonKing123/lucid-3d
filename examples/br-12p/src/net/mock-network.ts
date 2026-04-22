/**
 * mock-network.ts — 本地 Mock 网络。
 * 用 EventEmitter 模拟 WebSocket 广播，无需真实服务器，支持 headless 测试。
 */

import { EventEmitter } from '../../../../src/gameplay/event-emitter';
import type { NetworkMessage, MessageType } from './message-protocol';

type MockNetworkEvents = {
  [K in MessageType]: (msg: NetworkMessage & { type: K }) => void;
} & {
  'connected': () => void;
  'disconnected': () => void;
};

/** 单例 Mock 广播总线 —— 所有客户端共享此总线，模拟同一房间。 */
let _globalBus: EventEmitter<MockNetworkEvents> | null = null;

function getGlobalBus(): EventEmitter<MockNetworkEvents> {
  if (!_globalBus) {
    _globalBus = new EventEmitter<MockNetworkEvents>();
  }
  return _globalBus;
}

/** 重置全局总线（测试隔离用） */
export function resetMockNetwork(): void {
  _globalBus = new EventEmitter<MockNetworkEvents>();
}

/**
 * MockNetwork — 模拟 WebSocket 连接。
 * 连接到全局 Mock 总线，实现消息发送与接收。
 */
export class MockNetwork {
  private _bus: EventEmitter<MockNetworkEvents>;
  private _connected = false;

  constructor() {
    this._bus = getGlobalBus();
  }

  get isConnected(): boolean { return this._connected; }

  connect(): void {
    this._connected = true;
    this._bus.emit('connected');
  }

  disconnect(): void {
    this._connected = false;
    this._bus.emit('disconnected');
  }

  /** 向所有客户端广播消息（包括自身，模拟服务器回显） */
  send(msg: NetworkMessage): void {
    if (!this._connected) return;
    const bus = this._bus;
    // 通过 EventEmitter emit 分发到订阅者
    (bus as any).emit(msg.type, msg);
  }

  /** 订阅指定类型消息 */
  on<K extends MessageType>(
    type: K,
    handler: (msg: NetworkMessage & { type: K }) => void,
  ): void {
    this._bus.on(type as any, handler as any);
  }

  /** 取消订阅 */
  off<K extends MessageType>(
    type: K,
    handler: (msg: NetworkMessage & { type: K }) => void,
  ): void {
    this._bus.off(type as any, handler as any);
  }

  /** 获取底层总线（测试用） */
  get bus(): EventEmitter<MockNetworkEvents> { return this._bus; }
}
