import { Game } from './game';

declare global {
  interface Window {
    __game: Game;
  }
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = new Game(canvas);
game.start();

// 暴露游戏状态供调试和 Playwright 读取
window.__game = game;
// 标记 canvas 就绪
canvas.dataset.ready = '1';
