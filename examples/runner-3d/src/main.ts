import { Game } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = new Game(canvas);
game.start();
(window as any).__game = game; // Playwright 调试 hook
canvas.dataset.ready = '1';
