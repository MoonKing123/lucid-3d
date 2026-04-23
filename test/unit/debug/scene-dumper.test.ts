import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/debug/scene-dumper';
import { Node3D } from '../../../src/core/node3d';

const isStub = '__STUB__' in mod && (mod as unknown as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('SceneTreeDumper — 场景图 JSON 序列化', () => {
  describe('dumpScene', () => {
    it('单节点输出 name + type + transform', () => {
      const node = new Node3D('root');
      node.position = [1, 2, 3];
      const dump = mod.dumpScene(node);
      expect(dump.name).toBe('root');
      expect(dump.type).toBe('Node3D');
      expect(dump.position).toEqual([1, 2, 3]);
      expect(dump.children).toEqual([]);
    });

    it('嵌套层级递归序列化', () => {
      const root = new Node3D('root');
      const child = new Node3D('child');
      const grandchild = new Node3D('grandchild');
      root.add(child);
      child.add(grandchild);

      const dump = mod.dumpScene(root);
      expect(dump.children.length).toBe(1);
      expect(dump.children[0]?.name).toBe('child');
      expect(dump.children[0]?.children.length).toBe(1);
      expect(dump.children[0]?.children[0]?.name).toBe('grandchild');
    });

    it('visible 字段', () => {
      const node = new Node3D('hidden');
      node.visible = false;
      const dump = mod.dumpScene(node);
      expect(dump.visible).toBe(false);
    });

    it('rotation + scale 输出', () => {
      const node = new Node3D('test');
      node.rotation = [0.1, 0.2, 0.3];
      node.scale = [2, 2, 2];
      const dump = mod.dumpScene(node);
      expect(dump.rotation).toEqual([0.1, 0.2, 0.3]);
      expect(dump.scale).toEqual([2, 2, 2]);
    });

    it('maxDepth 截断深层子树', () => {
      const root = new Node3D('root');
      const child = new Node3D('child');
      const grandchild = new Node3D('grandchild');
      root.add(child);
      child.add(grandchild);

      const dump = mod.dumpScene(root, { maxDepth: 1 });
      expect(dump.children.length).toBe(1);
      expect(dump.children[0]?.children.length).toBe(0);
    });

    it('maxDepth=0 只输出 root', () => {
      const root = new Node3D('root');
      root.add(new Node3D('child'));
      const dump = mod.dumpScene(root, { maxDepth: 0 });
      expect(dump.children.length).toBe(0);
    });

    it('多个兄弟节点保持顺序', () => {
      const root = new Node3D('root');
      root.add(new Node3D('a'));
      root.add(new Node3D('b'));
      root.add(new Node3D('c'));
      const dump = mod.dumpScene(root);
      expect(dump.children.map(c => c.name)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('dumpSceneJSON', () => {
    it('返回合法 JSON 字符串', () => {
      const node = new Node3D('root');
      const json = mod.dumpSceneJSON(node);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('root');
    });

    it('indent 参数控制缩进', () => {
      const node = new Node3D('root');
      const compact = mod.dumpSceneJSON(node);
      const pretty = mod.dumpSceneJSON(node, undefined, 2);
      expect(pretty.length).toBeGreaterThan(compact.length);
      expect(pretty).toContain('\n');
    });

    it('空 indent 输出紧凑形式', () => {
      const node = new Node3D('root');
      const json = mod.dumpSceneJSON(node);
      expect(json).not.toContain('\n');
    });
  });
});
