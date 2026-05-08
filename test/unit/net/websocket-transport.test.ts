import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from '../../../src/net/websocket-transport';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  binaryType = 'blob';
  url: string;

  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebSocketTransport', () => {
  it('connect 后创建 WebSocket 连接', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain('room=room-1');
  });

  it('初始 connected 为 false', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    expect(t.connected).toBe(false);
  });

  it('WebSocket open 后 connected 为 true', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    expect(t.connected).toBe(true);
  });

  it('disconnect 后 connected 为 false', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    t.disconnect();
    expect(t.connected).toBe(false);
  });

  it('send 发送 JSON 消息', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    t.send('chat', { text: 'hello' });
    const sent = MockWebSocket.instances[0].sentMessages;
    expect(sent.length).toBe(1);
    expect(JSON.parse(sent[0])).toEqual({ type: 'chat', data: { text: 'hello' } });
  });

  it('send 在未连接时不发送', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    t.send('msg', {});
    expect(MockWebSocket.instances[0].sentMessages.length).toBe(0);
  });

  it('on 接收服务器推送的消息', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    const handler = vi.fn();
    t.on('chat', handler);
    MockWebSocket.instances[0].simulateMessage(JSON.stringify({ type: 'chat', data: { text: 'hi' } }));
    expect(handler).toHaveBeenCalledWith({ text: 'hi' });
  });

  it('off 移除监听器', () => {
    const t = new WebSocketTransport({ url: 'ws://localhost:8080' });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    const handler = vi.fn();
    t.on('msg', handler);
    t.off('msg', handler);
    MockWebSocket.instances[0].simulateMessage(JSON.stringify({ type: 'msg', data: {} }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('disconnect 阻止自动重连', () => {
    vi.useFakeTimers();
    const t = new WebSocketTransport({ url: 'ws://localhost:8080', reconnect: true, reconnectDelay: 100 });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    t.disconnect();
    vi.advanceTimersByTime(500);
    expect(MockWebSocket.instances.length).toBe(1);
    vi.useRealTimers();
  });

  it('reconnect:false 断线不重连', () => {
    vi.useFakeTimers();
    const t = new WebSocketTransport({ url: 'ws://localhost:8080', reconnect: false });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    MockWebSocket.instances[0].close();
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances.length).toBe(1);
    vi.useRealTimers();
  });

  it('reconnect:true 断线后重连', () => {
    vi.useFakeTimers();
    const t = new WebSocketTransport({ url: 'ws://localhost:8080', reconnect: true, reconnectDelay: 100 });
    t.connect('room-1');
    MockWebSocket.instances[0].simulateOpen();
    // 模拟意外断线（不调用 disconnect()）
    const ws = MockWebSocket.instances[0];
    ws.readyState = MockWebSocket.CLOSED;
    ws.onclose?.();
    vi.advanceTimersByTime(200);
    expect(MockWebSocket.instances.length).toBe(2);
    t.disconnect();
    vi.useRealTimers();
  });
});
