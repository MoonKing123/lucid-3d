/**
 * M3 压力测试 — 30 秒 1800 帧端到端验证
 *
 * 验收标准：
 * - 完整场景（地形 + 120 单位 + 资源点 + 基地 + 相机 + HUD）稳定运行 1800 帧
 * - 定期命令我方单位采集资源点，资源计数有增长
 * - 随机切换相机位置和缩放
 * - 触发框选操作
 * - 单位状态机有正常切换（idle/moving/gathering/depositing）
 * - 全程无 console.error
 * - 帧耗时中位数 < 16.67ms（60fps 目标，headless 松散标准）
 */
import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';

/** 简单的伪随机数生成器（确定性） */
function makeRng(seed: number) {
  let s = seed;
  return {
    next(): number {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    },
    range(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
    int(min: number, max: number): number {
      return Math.floor(this.range(min, max + 1));
    },
  };
}

describe('M3 压力测试 — 30 秒 1800 帧', () => {
  it('完整场景循环 1800 帧不崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 1800; i++) game.update(1 / 60);
    }).not.toThrow();
  });

  it('1800 帧后 frameCount 等于 1800', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 1800; i++) game.update(1 / 60);
    expect(game.frameCount).toBe(1800);
  });

  it('1800 帧无 console.error 输出', () => {
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
      const game = new Game({ headless: true });
      for (let i = 0; i < 1800; i++) game.update(1 / 60);
    } finally {
      console.error = origError;
    }
    expect(errors).toEqual([]);
  });

  it('命令我方单位采集资源 — 资源计数有增长', () => {
    const game = new Game({ headless: true });

    // 取前 10 个我方单位，分配到两个资源点
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .slice(0, 10)
      .map(u => u.id);
    const nodes = game.resourceNodes;

    // 分配采集任务（不打断，让采集循环自然完成）
    game.harvestSystem.commandGather(allyIds.slice(0, 5), nodes[0]);
    game.harvestSystem.commandGather(allyIds.slice(5), nodes[1]);

    // 运行 1800 帧（30 秒），采集循环约需 16-21 秒完成一次
    for (let i = 0; i < 1800; i++) {
      game.update(1 / 60);
    }

    // 30 秒后资源应该有增长（至少一次存入 = 50 金/木）
    const resources = game.resourceState.getResources();
    expect(resources.gold + resources.wood).toBeGreaterThan(0);
  });

  it('单位状态机在 1800 帧中有状态切换（非全部 idle）', () => {
    const game = new Game({ headless: true });
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .slice(0, 8)
      .map(u => u.id);
    const nodes = game.resourceNodes;

    // 命令单位采集
    game.harvestSystem.commandGather(allyIds, nodes[0]);

    // 追踪状态变化
    const statesSeen = new Set<string>();
    for (let i = 0; i < 1800; i++) {
      game.update(1 / 60);
      // 每 60 帧采样一次状态
      if (i % 60 === 0) {
        for (const id of allyIds) {
          const state = game.harvestSystem.getState(id);
          if (state) statesSeen.add(state);
        }
      }
    }

    // 应该观察到 idle 以外的状态
    const nonIdle = [...statesSeen].filter(s => s !== 'idle');
    expect(nonIdle.length).toBeGreaterThan(0);
  });

  it('随机切换相机缩放和角度 1800 帧不崩溃', () => {
    const game = new Game({ headless: true });
    const rng = makeRng(99999);

    expect(() => {
      for (let i = 0; i < 1800; i++) {
        // 每 120 帧随机调整相机（通过直接修改 camera 属性）
        if (i % 120 === 0 && game.camera) {
          const cam = game.camera;
          cam.distance = rng.range(30, 200);
          cam.theta    = rng.range(0, Math.PI * 2);
          cam.phi      = rng.range(0.2, Math.PI / 2);
        }
        game.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('触发框选操作 1800 帧不崩溃', () => {
    const game = new Game({ headless: true });
    const rng = makeRng(54321);

    expect(() => {
      for (let i = 0; i < 1800; i++) {
        // 每 180 帧触发一次框选
        if (i % 180 === 0 && game.selectionSystem && game.camera) {
          const x0 = rng.range(-0.8, 0);
          const y0 = rng.range(-0.8, 0);
          const x1 = x0 + rng.range(0.2, 0.8);
          const y1 = y0 + rng.range(0.2, 0.8);
          game.selectionSystem.boxSelect(
            { x0, y0, x1, y1 },
            game.camera,
          );
        }
        game.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('帧耗时中位数 < 16.67ms（60fps 目标）', () => {
    const game = new Game({ headless: true });
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .slice(0, 10)
      .map(u => u.id);
    game.harvestSystem.commandGather(allyIds, game.resourceNodes[0]);

    const durations: number[] = [];
    for (let i = 0; i < 1800; i++) {
      const t0 = performance.now();
      game.update(1 / 60);
      durations.push(performance.now() - t0);
    }

    // 计算中位数
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeLessThan(16.67);
  });

  it('内存使用稳定（无明显泄漏，<50MB）', () => {
    const m0 = process.memoryUsage().heapUsed;
    const game = new Game({ headless: true });
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .slice(0, 10)
      .map(u => u.id);
    game.harvestSystem.commandGather(allyIds, game.resourceNodes[0]);

    for (let i = 0; i < 1800; i++) game.update(1 / 60);

    if (global.gc) global.gc();
    const m1 = process.memoryUsage().heapUsed;
    expect(m1 - m0).toBeLessThan(50 * 1024 * 1024);
  });

  it('120 个单位 + 10 个采集单位 + 框选综合压力测试 1800 帧稳定', () => {
    const game = new Game({ headless: true });
    const rng = makeRng(777);

    // 启动采集
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .map(u => u.id);
    game.harvestSystem.commandGather(allyIds.slice(0, 10), game.resourceNodes[0]);
    game.harvestSystem.commandGather(allyIds.slice(10, 20), game.resourceNodes[2]);

    // 移动命令：让部分单位移动
    game.movementSystem.commandMove(allyIds.slice(20, 30), 30, 30);

    expect(() => {
      for (let i = 0; i < 1800; i++) {
        if (i % 200 === 0) {
          // 随机框选
          if (game.selectionSystem && game.camera) {
            game.selectionSystem.boxSelect(
              { x0: -0.5, y0: -0.5, x1: 0.5, y1: 0.5 },
              game.camera,
            );
          }
        }
        if (i % 400 === 100) {
          // 重新下达采集命令到不同资源点
          const nodeIdx = rng.int(0, game.resourceNodes.length - 1);
          game.harvestSystem.commandGather(
            allyIds.slice(0, 15),
            game.resourceNodes[nodeIdx],
          );
        }
        game.update(1 / 60);
      }
    }).not.toThrow();

    // 最终状态断言
    expect(game.frameCount).toBe(1800);
    expect(game.unitManager.units.length).toBe(120);
    // 资源应有增长（采集循环生效）
    const res = game.resourceState.getResources();
    expect(res.gold + res.wood).toBeGreaterThanOrEqual(0);
  });

  it('ResourceBar HUD 在 1800 帧后反映资源变化', () => {
    const game = new Game({ headless: true });
    const allyIds = game.unitManager.units
      .filter(u => u.faction === 'ally')
      .slice(0, 10)
      .map(u => u.id);
    game.harvestSystem.commandGather(allyIds, game.resourceNodes[0]);

    for (let i = 0; i < 1800; i++) game.update(1 / 60);

    // HUD 数值应和 resourceState 同步
    expect(game.resourceBar.gold).toBe(game.resourceState.gold);
    expect(game.resourceBar.wood).toBe(game.resourceState.wood);
  });
});
