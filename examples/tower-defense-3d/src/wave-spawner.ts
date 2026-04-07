import { Enemy } from './enemy';
import type { Map } from './map';

export interface Wave {
  count: number;       // 本波敌人数
  interval: number;    // 出怪间隔（秒）
  enemyHealth: number; // 本波敌人血量
}

export class WaveSpawner {
  private waves: Wave[];
  private currentWave: number = 0;
  private spawnedInWave: number = 0;
  private timeSinceLastSpawn: number = 0;
  private map: Map;
  readonly enemies: Enemy[] = [];

  constructor(map: Map, waves: Wave[]) {
    this.map = map;
    this.waves = waves;
  }

  update(dt: number): void {
    if (this.currentWave >= this.waves.length) return;
    const wave = this.waves[this.currentWave];
    this.timeSinceLastSpawn += dt;
    while (
      this.spawnedInWave < wave.count &&
      this.timeSinceLastSpawn >= wave.interval
    ) {
      const enemy = new Enemy({ map: this.map, maxHealth: wave.enemyHealth });
      this.enemies.push(enemy);
      this.spawnedInWave++;
      this.timeSinceLastSpawn -= wave.interval;
    }
    if (this.spawnedInWave >= wave.count) {
      this.currentWave++;
      this.spawnedInWave = 0;
      // 重置计时器，等待下一波
      this.timeSinceLastSpawn = 0;
    }

    // 推进所有活敌人
    for (const e of this.enemies) e.update(dt);
  }

  /** 当前活敌人数（未死亡且未到达终点） */
  get activeEnemies(): number {
    return this.enemies.filter(e => !e.dead && !e.reachedEnd).length;
  }
}
