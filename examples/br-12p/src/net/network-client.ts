/**
 * network-client.ts — 本地玩家网络客户端。
 * 负责将本地玩家状态广播出去，以及处理玩家自身受到的网络命中事件。
 */

import type { IGameNetwork } from './game-network';
import type { StateSync } from './state-sync';
import type { PlayerHitMsg } from './message-protocol';

/** 状态发送频率（Hz） */
const STATE_SEND_HZ = 10;
const STATE_SEND_INTERVAL = 1 / STATE_SEND_HZ;

export class NetworkClient {
  private readonly _net: IGameNetwork;
  private readonly _sync: StateSync;
  readonly localId: string;
  readonly localName: string;

  private _sendTimer = 0;

  /** 本地玩家的位置/旋转获取函数 */
  private _getPosition?: () => { x: number; y: number; z: number };
  private _getRotation?: () => number;
  private _getHealth?: () => number;

  /** 本地受到命中的回调（供 Game 注册） */
  private _onLocalHit?: (attackerId: string, damage: number) => void;

  constructor(net: IGameNetwork, sync: StateSync, id: string, name: string) {
    this._net = net;
    this._sync = sync;
    this.localId = id;
    this.localName = name;

    // 监听命中事件，过滤出针对本地玩家的
    this._net.on('player.hit', (msg: PlayerHitMsg) => {
      if (msg.targetId === this.localId) {
        this._onLocalHit?.(msg.attackerId, msg.damage);
      }
    });
  }

  /** 绑定本地状态获取函数 */
  bindLocalState(
    getPosition: () => { x: number; y: number; z: number },
    getRotation: () => number,
    getHealth: () => number,
  ): void {
    this._getPosition = getPosition;
    this._getRotation = getRotation;
    this._getHealth = getHealth;
  }

  /** 注册本地受命中回调 */
  onLocalHit(cb: (attackerId: string, damage: number) => void): void {
    this._onLocalHit = cb;
  }

  /** 广播加入消息 */
  join(): void {
    const pos = this._getPosition?.() ?? { x: 0, y: 0, z: 0 };
    this._net.send({
      type: 'player.join',
      id: this.localId,
      name: this.localName,
      position: pos,
    });
  }

  /** 广播离开消息 */
  leave(): void {
    this._net.send({ type: 'player.leave', id: this.localId });
  }

  /** 广播射击事件 */
  fire(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponId = 'default'): void {
    this._net.send({
      type: 'player.fire',
      id: this.localId,
      origin,
      direction,
      weaponId,
    });
  }

  /** 广播死亡 */
  die(): void {
    this._net.send({ type: 'player.die', id: this.localId });
  }

  /** 广播复活 */
  respawn(position: { x: number; y: number; z: number }): void {
    this._net.send({ type: 'player.respawn', id: this.localId, position });
  }

  /** 每帧调用：按频率广播本地状态 */
  update(dt: number): void {
    this._sendTimer += dt;
    if (this._sendTimer >= STATE_SEND_INTERVAL) {
      this._sendTimer -= STATE_SEND_INTERVAL;
      this._broadcastState();
    }
    this._sync.update(dt);
  }

  private _broadcastState(): void {
    if (!this._getPosition) return;
    this._net.send({
      type: 'player.state',
      id: this.localId,
      position: this._getPosition(),
      rotation: this._getRotation?.() ?? 0,
      health: this._getHealth?.() ?? 100,
    });
  }
}
