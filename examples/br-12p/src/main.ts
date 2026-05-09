/**
 * main.ts — BR-12P 游戏入口。
 * 初始化 Canvas，创建 Game，连接 WebSocket 服务器，启动循环。
 */

import { Game } from './game';
import { vec3 } from '../../../src/math/vec3';
import { WsGameNetwork } from './net/ws-game-network';
import { StateSync } from './net/state-sync';
import { NetworkClient } from './net/network-client';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = new Game(canvas);
(window as any).__game = game;

// 生成 11 个 AI 敌人（供视觉回归测试用）
game.spawnEnemies(11);

// 网络层：连接服务器（连接失败时静默降级，游戏仍可单机运行）
const localId = 'player-' + Math.random().toString(36).slice(2, 8);
const net = new WsGameNetwork('ws://localhost:8080');
const sync = new StateSync(net, localId);
const client = new NetworkClient(net, sync, localId, '本地玩家');

client.bindLocalState(
  () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
  () => game.fpsCamera.yaw,
  () => game.playerHealth.current,
);

net.connect();

// 连接成功后发送 join 消息
const checkConnected = setInterval(() => {
  if (net.isConnected) {
    clearInterval(checkConnected);
    client.join();
  }
}, 100);

// 每帧更新网络
game.addUpdateCallback((dt) => client.update(dt));

// 鼠标左键射击
canvas.addEventListener('click', () => {
  const cam = game.camera;
  const origin = vec3(cam.position[0], cam.position[1], cam.position[2]);
  const dir = game.fpsCamera.getViewDirection();
  game.weapon.fire(origin, dir);

  // 广播射击事件
  if (net.isConnected) {
    client.fire(
      { x: origin[0], y: origin[1], z: origin[2] },
      { x: dir[0], y: dir[1], z: dir[2] },
    );
  }
});

game.start();
