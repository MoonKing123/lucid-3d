/**
 * state-sync.ts — 多人状态同步层。
 * 接收网络消息 → 管理远程玩家实例 → 应用状态快照。
 */

import { RemotePlayer } from './remote-player';
import type { MockNetwork } from './mock-network';
import type {
  PlayerJoinMsg,
  PlayerLeaveMsg,
  PlayerStateMsg,
  PlayerFireMsg,
  PlayerHitMsg,
  PlayerDieMsg,
  PlayerRespawnMsg,
} from './message-protocol';

export type StateSyncEvents = {
  'player.joined': (player: RemotePlayer) => void;
  'player.left': (id: string) => void;
  'player.fired': (id: string, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponId: string) => void;
};

/**
 * StateSync — 管理 11 个远程玩家的生命周期和状态同步。
 */
export class StateSync {
  private readonly _players = new Map<string, RemotePlayer>();
  private readonly _net: MockNetwork;
  /** 本地玩家 ID，收到自己的消息时忽略 */
  private readonly _localId: string;

  private _onJoined?: (player: RemotePlayer) => void;
  private _onLeft?: (id: string) => void;
  private _onFired?: (id: string, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponId: string) => void;

  constructor(net: MockNetwork, localId = '') {
    this._net = net;
    this._localId = localId;
    this._registerHandlers();
  }

  get players(): ReadonlyMap<string, RemotePlayer> { return this._players; }

  get playerCount(): number { return this._players.size; }

  onPlayerJoined(cb: (player: RemotePlayer) => void): void {
    this._onJoined = cb;
  }

  onPlayerLeft(cb: (id: string) => void): void {
    this._onLeft = cb;
  }

  onPlayerFired(cb: (id: string, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponId: string) => void): void {
    this._onFired = cb;
  }

  /** 每帧更新所有远程玩家 */
  update(dt: number): void {
    for (const player of this._players.values()) {
      player.update(dt);
    }
  }

  private _registerHandlers(): void {
    this._net.on('player.join', (msg: PlayerJoinMsg) => {
      if (msg.id === this._localId || this._players.has(msg.id)) return;
      const player = new RemotePlayer(msg.id, msg.name, msg.position);
      player.onRespawnNeeded = (id) => this._handleRespawnNeeded(id);
      this._players.set(msg.id, player);
      this._onJoined?.(player);
    });

    this._net.on('player.leave', (msg: PlayerLeaveMsg) => {
      if (this._players.delete(msg.id)) {
        this._onLeft?.(msg.id);
      }
    });

    this._net.on('player.state', (msg: PlayerStateMsg) => {
      const player = this._players.get(msg.id);
      if (!player) return;
      player.applyState(msg.position, msg.rotation, msg.health);
    });

    this._net.on('player.fire', (msg: PlayerFireMsg) => {
      this._onFired?.(msg.id, msg.origin, msg.direction, msg.weaponId);
    });

    this._net.on('player.hit', (msg: PlayerHitMsg) => {
      const target = this._players.get(msg.targetId);
      if (target) {
        target.applyDamage(msg.damage);
      }
    });

    this._net.on('player.die', (msg: PlayerDieMsg) => {
      const player = this._players.get(msg.id);
      if (player && !player.isDead) {
        player.applyDamage(player.health.current);
      }
    });

    this._net.on('player.respawn', (msg: PlayerRespawnMsg) => {
      const player = this._players.get(msg.id);
      if (player) {
        player.respawn(msg.position);
      }
    });
  }

  private _handleRespawnNeeded(id: string): void {
    const pos = RemotePlayer.randomSpawnPosition();
    // 广播复活消息（通知所有客户端）
    this._net.send({
      type: 'player.respawn',
      id,
      position: pos,
    });
  }
}
