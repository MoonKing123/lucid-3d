import { Tower } from './tower';
import { Enemy } from './enemy';
import { Projectile } from './projectile';

export class CombatSystem {
  readonly projectiles: Projectile[] = [];

  update(dt: number, towers: Tower[], enemies: Enemy[]): void {
    for (const tower of towers) {
      tower.cooldownLeft = Math.max(0, tower.cooldownLeft - dt);

      // 目标失效（死亡或离开射程）→ 重置目标
      if (tower.target && (tower.target.dead || this._dist(tower, tower.target) > tower.config.range)) {
        tower.target = null;
        tower.fsm.transition('idle');
      }

      // 搜索新目标
      if (!tower.target) {
        let nearest: Enemy | null = null;
        let nearestDist = tower.config.range;
        for (const e of enemies) {
          if (e.dead || e.reachedEnd) continue;
          const d = this._dist(tower, e);
          if (d <= nearestDist) { nearest = e; nearestDist = d; }
        }
        tower.target = nearest;
        if (tower.target) {
          tower.fsm.transition('targeting');
        }
      }

      // 攻击：目标有效且冷却结束
      if (tower.target && tower.cooldownLeft <= 0) {
        tower.fsm.transition('attacking');
        const projectile = new Projectile({
          target: tower.target,
          damage: tower.config.damage,
          from: [tower.node.position[0], tower.node.position[1] + 1, tower.node.position[2]],
        });
        this.projectiles.push(projectile);
        tower.cooldownLeft = tower.config.cooldown;
      }
    }

    // 推进 projectile，清理已完成的
    for (const p of this.projectiles) p.update(dt);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].done) this.projectiles.splice(i, 1);
    }
  }

  private _dist(tower: Tower, enemy: Enemy): number {
    const dx = tower.node.position[0] - enemy.node.position[0];
    const dz = tower.node.position[2] - enemy.node.position[2];
    return Math.sqrt(dx * dx + dz * dz);
  }
}
