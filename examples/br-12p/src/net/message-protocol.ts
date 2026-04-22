/**
 * message-protocol.ts — 多人网络同步消息协议。
 * 定义 12 人 BR 游戏所需的消息类型：join/leave/state/fire/hit/die/respawn。
 */

export type MessageType =
  | 'player.join'
  | 'player.leave'
  | 'player.state'
  | 'player.fire'
  | 'player.hit'
  | 'player.die'
  | 'player.respawn';

export interface Vec3Data { x: number; y: number; z: number; }

/** 新玩家加入房间 */
export interface PlayerJoinMsg {
  type: 'player.join';
  id: string;
  name: string;
  position: Vec3Data;
}

/** 玩家离开房间 */
export interface PlayerLeaveMsg {
  type: 'player.leave';
  id: string;
}

/** 高频位置/状态快照（~10Hz） */
export interface PlayerStateMsg {
  type: 'player.state';
  id: string;
  position: Vec3Data;
  rotation: number;
  health: number;
}

/** 射击事件 */
export interface PlayerFireMsg {
  type: 'player.fire';
  id: string;
  origin: Vec3Data;
  direction: Vec3Data;
  weaponId: string;
}

/** 命中事件 */
export interface PlayerHitMsg {
  type: 'player.hit';
  attackerId: string;
  targetId: string;
  damage: number;
}

/** 死亡事件 */
export interface PlayerDieMsg {
  type: 'player.die';
  id: string;
}

/** 复活事件 */
export interface PlayerRespawnMsg {
  type: 'player.respawn';
  id: string;
  position: Vec3Data;
}

export type NetworkMessage =
  | PlayerJoinMsg
  | PlayerLeaveMsg
  | PlayerStateMsg
  | PlayerFireMsg
  | PlayerHitMsg
  | PlayerDieMsg
  | PlayerRespawnMsg;
