/**
 * main.ts — BR-12P 游戏入口。
 * 初始化 Canvas，创建 Game 并启动循环。
 */

import { Game } from './game';
import { vec3 } from '../../../src/math/vec3';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = new Game(canvas);
(window as any).__game = game;  // 调试用

// 生成 11 个 AI 敌人
game.spawnEnemies(11);

// 鼠标左键射击
canvas.addEventListener('click', () => {
  const cam = game.camera;
  const origin = vec3(cam.position[0], cam.position[1], cam.position[2]);
  const dir = game.fpsCamera.getViewDirection();
  game.weapon.fire(origin, dir);
});

game.start();
