/**
 * mock-network.ts — 本地 Mock 网络（基于引擎 src/net/mock-network）。
 * 提供游戏专用 API 包装，底层使用引擎的房间路由实现。
 */

import {
  MockNetwork as _EngineMockNetwork,
  createMockNetwork as _create,
  resetMockNetwork as _reset,
} from '../../../../src/net/mock-network';
import type { IGameNetwork } from './game-network';
import type { NetworkMessage, MessageType } from './message-protocol';

const GAME_ROOM = 'br-12p';

/** 重置全局网络状态（测试隔离用） */
export function resetMockNetwork(): void {
  _reset();
}

/**
 * MockNetwork — 游戏专用网络封装。
 * 将引擎的 INetworkTransport 适配为游戏消息协议 API。
 */
export class MockNetwork implements IGameNetwork {
  private readonly _net: _EngineMockNetwork;
  private _connected = false;

  constructor() {
    this._net = _create();
  }

  get isConnected(): boolean { return this._connected; }

  connect(): void {
    this._net.connect(GAME_ROOM);
    this._connected = true;
  }

  disconnect(): void {
    this._net.disconnect();
    this._connected = false;
  }

  send(msg: NetworkMessage): void {
    if (!this._connected) return;
    this._net.send(msg.type, msg);
    // 自回环：模拟服务器将消息广播回发送方（真实网络语义）
    // br-12p 用单实例身兼发送端+接收端，引擎层 send() 不回环自身，需在此补回
    (this._net as any)._deliver(msg.type, msg);
  }

  on<K extends MessageType>(
    type: K,
    handler: (msg: NetworkMessage & { type: K }) => void,
  ): void {
    this._net.on(type, handler as (data: unknown) => void);
  }

  off<K extends MessageType>(
    type: K,
    handler: (msg: NetworkMessage & { type: K }) => void,
  ): void {
    this._net.off(type, handler as (data: unknown) => void);
  }
}
