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

// 暴露 game 实例供调试和测试使用
window.__game = game;
