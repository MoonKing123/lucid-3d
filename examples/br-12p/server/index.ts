/**
 * server/index.ts — BR-12P 游戏服务器。
 * 使用引擎 GameServer 实现 12 人房间消息中继。
 * 启动：npx vite-node server/index.ts 或 pnpm --filter br-12p server:start
 */

import { GameServer } from '../../../src/net/server';
import { ServerStateSync } from '../../../src/net/server-state-sync';

const PORT = Number(process.env.BR_PORT ?? 8080);
const ROOM = 'br-12p';
const MAX_CLIENTS = 12;

interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  health: number;
}

async function main(): Promise<void> {
  const server = new GameServer({ port: PORT, maxClientsPerRoom: MAX_CLIENTS });

  // 服务端权威状态追踪（delta 广播）
  const stateSync = new ServerStateSync<PlayerState>({
    server,
    tickRate: 20,
    stateMessage: 'server.state',
  });

  server.onClientJoin((clientId, roomId) => {
    if (roomId === ROOM) {
      console.log(`[br-12p] 玩家连入 ${clientId} (房间: ${roomId}，当前: ${server.clientCount})`);
    }
  });

  server.onClientLeave((clientId, roomId) => {
    if (roomId === ROOM) {
      console.log(`[br-12p] 玩家离开 ${clientId} (剩余: ${server.clientCount})`);
    }
  });

  // 监听客户端上报的玩家状态，更新服务端权威副本
  server.onMessage((clientId, type, data) => {
    if (type === 'player.state') {
      const msg = data as { id: string; position: { x: number; y: number; z: number }; rotation: number; health: number };
      if (msg?.id) {
        stateSync.setEntityState(msg.id, {
          id: msg.id,
          position: msg.position,
          rotation: msg.rotation,
          health: msg.health,
        });
      }
    }
  });

  await server.start();
  stateSync.start();

  console.log(`[br-12p] 服务器已启动 → ws://localhost:${PORT}  (room=${ROOM}，最多${MAX_CLIENTS}人)`);

  process.on('SIGINT', async () => {
    stateSync.stop();
    await server.stop();
    console.log('[br-12p] 服务器已关闭');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[br-12p] 服务器启动失败:', err);
  process.exit(1);
});
