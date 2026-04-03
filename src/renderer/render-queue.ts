/**
 * RenderQueue — 渲染队列排序：不透明前到后、透明后到前。
 * @see test/unit/renderer/render-queue.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

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
 * @param items 渲染项数组
 */
export function buildRenderQueue<T extends QueueItem>(items: T[]): SortedQueue<T> {
  return { opaque: [], transparent: [] };
}
