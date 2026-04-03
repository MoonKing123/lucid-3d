/**
 * RenderInfo — 每帧渲染统计信息。
 * WebGLRenderer 在 render() 期间填充，外部可读取用于性能监控。
 *
 * @see test/unit/renderer/render-info.test.ts
 */
export const __STUB__ = true;

export interface RenderInfo {
  /** 本帧 draw call 次数 */
  drawCalls: number;
  /** 本帧渲染的三角形总数 */
  triangles: number;
  /** 本帧渲染的实例总数（InstancedMesh 的 count 之和） */
  instances: number;
  /** 本帧被视锥裁剪的 Mesh 数量 */
  culled: number;
  /** 本帧渲染耗时（毫秒） */
  frameTime: number;
}

/** 创建一个归零的 RenderInfo 对象 */
export function createRenderInfo(): RenderInfo {
  return {
    drawCalls: 0,
    triangles: 0,
    instances: 0,
    culled: 0,
    frameTime: 0,
  };
}

/** 将 RenderInfo 所有字段重置为 0 */
export function resetRenderInfo(info: RenderInfo): void {
  info.drawCalls = 0;
  info.triangles = 0;
  info.instances = 0;
  info.culled = 0;
  info.frameTime = 0;
}
