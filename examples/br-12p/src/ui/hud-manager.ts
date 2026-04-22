/**
 * HUDManager — 订阅 EventEmitter 事件，统一管理所有 HUD 组件。
 */
import { type Game } from '../game';
import { Crosshair } from './crosshair';
import { HealthBar } from './health-bar';
import { AmmoDisplay } from './ammo-display';
import { Minimap } from './minimap';
import { KillFeed } from './kill-feed';
import { DeathMenu } from './death-menu';
import { VictoryMenu } from './victory-menu';

export class HUDManager {
  readonly crosshair: Crosshair;
  readonly healthBar: HealthBar;
  readonly ammoDisplay: AmmoDisplay;
  readonly minimap: Minimap;
  readonly killFeed: KillFeed;
  readonly deathMenu: DeathMenu;
  readonly victoryMenu: VictoryMenu;

  private readonly _game: Game;

  constructor(game: Game, width: number, height: number) {
    this._game = game;

    this.crosshair   = new Crosshair(width, height);
    this.healthBar   = new HealthBar(width, height);
    this.ammoDisplay = new AmmoDisplay(width, height);
    this.minimap     = new Minimap({ screenWidth: width, screenHeight: height });
    this.killFeed    = new KillFeed(width, height);
    this.deathMenu   = new DeathMenu(width, height);
    this.victoryMenu = new VictoryMenu(width, height);

    // 初始值
    this.ammoDisplay.setAmmo(game.weapon.ammo, game.weapon.maxAmmo);
    this.healthBar.update(game.playerHealth.current, game.playerHealth.max);

    // ── 武器事件 ──
    game.weapon.on('weapon.fired', (ammoRemaining) => {
      this.ammoDisplay.setAmmo(ammoRemaining, game.weapon.maxAmmo);
      this.crosshair.setSpread(0.3);
    });

    game.weapon.on('weapon.hit', () => {
      this.crosshair.hit();
    });

    game.weapon.on('weapon.reload_start', () => {
      this.ammoDisplay.setReloading(true, 0);
    });

    game.weapon.on('weapon.reload_end', () => {
      this.ammoDisplay.setReloading(false);
      this.ammoDisplay.setAmmo(game.weapon.ammo, game.weapon.maxAmmo);
    });

    // ── 玩家血量事件 ──
    game.playerHealth.on('health.changed', (current, max) => {
      this.healthBar.update(current, max);
    });

    game.playerHealth.on('health.died', () => {
      this.deathMenu.show();
    });

    // ── 击杀 / 胜利事件 ──
    game.events.on('kill', (victimId, attackerId) => {
      this.killFeed.addKill(attackerId, victimId);
    });

    game.events.on('victory', () => {
      this.victoryMenu.show(0, 0);
    });
  }

  /** 更新小地图：收集所有存活敌人 + 本地玩家 */
  updateMinimap(): void {
    const players = this._game.enemies.map((e, i) => ({
      id: e.node.name || `enemy-${i}`,
      x: e.node.position[0],
      z: e.node.position[2],
      isLocal: false,
      isDead: e.health.isDead,
    }));

    const pp = this._game.player.position;
    players.unshift({
      id: 'player',
      x: pp[0],
      z: pp[2],
      isLocal: true,
      isDead: this._game.playerHealth.isDead,
    });

    this.minimap.update(players);
  }

  update(dt: number): void {
    this.crosshair.update(dt);
    this.killFeed.update(dt);
    this.deathMenu.update(dt);
    this.updateMinimap();
  }
}
