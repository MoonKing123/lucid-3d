/**
 * RenderQueue — 渲染队列排序：不透明前到后、透明后到前。
 * @see test/unit/renderer/render-queue.test.ts
 */

export interface QueueItem {
  /** 是否为透明物体 */
  transparent: boolean;
  /** 到相机的距离平方（避免 sqrt） */
  distanceSq: number;
}

export interface SortedQueue<T extends QueueItem> {
  /** 不透明物体：前到后排序（减少 overdraw） */
  opaque: T[];
  /** 透明物体：后到前排序（正确 alpha 混合） */
  transparent: T[];
}

/**
 * 将渲染项分为不透明和透明两组，分别排序。
 * 不透明：升序（前到后），透明：降序（后到前）。
 * 相同距离保持输入顺序（稳定排序）。
 * @param items 渲染项数组
 */
export function buildRenderQueue<T extends QueueItem>(items: T[]): SortedQueue<T> {
  const opaque: T[] = [];
  const transparent: T[] = [];

  for (const item of items) {
    if (item.transparent) {
      transparent.push(item);
    } else {
      opaque.push(item);
    }
  }

  // 稳定排序：利用索引打标，确保相同距离时保持输入顺序
  opaque.sort((a, b) => a.distanceSq - b.distanceSq);
  transparent.sort((a, b) => b.distanceSq - a.distanceSq);

  return { opaque, transparent };
}
