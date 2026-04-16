/**
 * main.ts — BR-12P 游戏入口。
 * 初始化 Canvas，创建 Game 并启动循环。
 */

import { Game } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = new Game(canvas);
(window as any).__game = game;  // 调试用
game.start();
