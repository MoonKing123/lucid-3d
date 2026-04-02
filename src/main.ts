import { initRenderer, renderFrame } from './renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const state = initRenderer(canvas);

renderFrame(state);

// Signal to Playwright that rendering is complete
canvas.dataset.ready = '1';

console.log('[lucid-3d] Triangle rendered. Ready for screenshot.');
