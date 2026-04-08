/**
 * ResourceState — 全局资源状态 + EventEmitter。
 *
 * 事件：
 *   resource.changed     — 资源数量变化时触发（gold 或 wood 变动）
 *   unit.state.changed   — 单位采集状态变化时触发
 *
 * 全局访问：实例挂载到 window.__game.resources 供测试读取。
 */
import { EventEmitter } from '../../../src/gameplay/event-emitter';

export interface Resources {
  gold: number;
  wood: number;
}

export type GameEvents = {
  'resource.changed':   (resources: Resources) => void;
  'unit.state.changed': (unitId: number, state: string) => void;
};

export class ResourceState {
  private _gold = 0;
  private _wood = 0;

  /** 游戏全局事件总线（resource + unit 状态事件均走此处） */
  readonly events = new EventEmitter<GameEvents>();

  get gold(): number { return this._gold; }
  get wood(): number { return this._wood; }

  addGold(amount: number): void {
    this._gold += amount;
    this.events.emit('resource.changed', { gold: this._gold, wood: this._wood });
  }

  addWood(amount: number): void {
    this._wood += amount;
    this.events.emit('resource.changed', { gold: this._gold, wood: this._wood });
  }

  getResources(): Resources {
    return { gold: this._gold, wood: this._wood };
  }
}
