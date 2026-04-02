/**
 * STUB — InputManager (not yet implemented).
 * @see test/unit/core/input.test.ts
 */
export const __STUB__ = true;

export interface InputEventData {
  type: 'keydown' | 'keyup' | 'pointerdown' | 'pointerup' | 'pointermove';
  key?: string;
  button?: number;
  x?: number;
  y?: number;
  ndcX?: number;
  ndcY?: number;
}

export type InputListener = (event: InputEventData) => void;

export interface InputTarget {
  width: number;
  height: number;
  addEventListener(type: string, handler: Function): void;
  removeEventListener(type: string, handler: Function): void;
}

export class InputManager {
  constructor(_element: InputTarget) {
    throw new Error('Not implemented');
  }

  isKeyDown(_key: string): boolean {
    throw new Error('Not implemented');
  }

  wasKeyPressed(_key: string): boolean {
    throw new Error('Not implemented');
  }

  isPointerDown(_button?: number): boolean {
    throw new Error('Not implemented');
  }

  getPointerPosition(): { x: number; y: number } {
    throw new Error('Not implemented');
  }

  getPointerNDC(): { x: number; y: number } {
    throw new Error('Not implemented');
  }

  on(_type: string, _listener: InputListener): void {
    throw new Error('Not implemented');
  }

  off(_type: string, _listener: InputListener): void {
    throw new Error('Not implemented');
  }

  update(): void {
    throw new Error('Not implemented');
  }

  dispose(): void {
    throw new Error('Not implemented');
  }
}
