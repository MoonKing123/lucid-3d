import { Game } from './game';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const game = new Game(canvas);

let isDragging = false;
let lastX = 0, lastY = 0;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) { isDragging = true; lastX = e.clientX; lastY = e.clientY; }
});
canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  game.applyMouseDelta(e.clientX - lastX, e.clientY - lastY);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.setAttribute('tabindex', '0');
canvas.focus();

const keysDown = new Set<string>();
canvas.addEventListener('keydown', (e) => {
  if (!keysDown.has(e.key)) { keysDown.add(e.key); game.simulateKey(e.key); }
});
canvas.addEventListener('keyup', (e) => {
  keysDown.delete(e.key);
  game.releaseKey(e.key);
});

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

game.start();
