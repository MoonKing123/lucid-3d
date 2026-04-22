export const __STUB__ = true;

import type { INetworkTransport } from './transport';

export class MockNetwork implements INetworkTransport {
  get connected(): boolean { throw new Error('Not implemented'); }
  send(_type: string, _data: unknown): void { throw new Error('Not implemented'); }
  on(_type: string, _handler: (data: unknown) => void): void { throw new Error('Not implemented'); }
  off(_type: string, _handler: (data: unknown) => void): void { throw new Error('Not implemented'); }
  connect(_roomId: string): void { throw new Error('Not implemented'); }
  disconnect(): void { throw new Error('Not implemented'); }
}

export function createMockNetwork(): MockNetwork {
  throw new Error('Not implemented');
}

export function resetMockNetwork(): void {
  throw new Error('Not implemented');
}
