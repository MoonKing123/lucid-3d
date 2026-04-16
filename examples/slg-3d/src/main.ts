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

// 启动采集演示：让部分我方单位开始采集
const allyIds = game.unitManager.units
  .filter(u => u.faction === 'ally')
  .slice(0, 10)
  .map(u => u.id);
game.harvestSystem.commandGather(allyIds.slice(0, 5), game.resourceNodes[0]);
game.harvestSystem.commandGather(allyIds.slice(5), game.resourceNodes[2]);

// 标记 canvas 就绪
canvas.dataset.ready = '1';
