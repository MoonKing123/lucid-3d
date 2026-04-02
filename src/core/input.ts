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
  private element: InputTarget;
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private buttonsDown = new Set<number>();
  private pointerX = 0;
  private pointerY = 0;
  private listeners = new Map<string, Set<InputListener>>();

  private onKeyDown = (e: { key: string }) => {
    if (!this.keysDown.has(e.key)) {
      this.keysPressed.add(e.key);
    }
    this.keysDown.add(e.key);
    this.emit({ type: 'keydown', key: e.key });
  };

  private onKeyUp = (e: { key: string }) => {
    this.keysDown.delete(e.key);
    this.emit({ type: 'keyup', key: e.key });
  };

  private onPointerDown = (e: { button: number; offsetX: number; offsetY: number }) => {
    this.buttonsDown.add(e.button);
    this.pointerX = e.offsetX;
    this.pointerY = e.offsetY;
    this.emit({
      type: 'pointerdown',
      button: e.button,
      x: e.offsetX,
      y: e.offsetY,
      ndcX: this.toNdcX(e.offsetX),
      ndcY: this.toNdcY(e.offsetY),
    });
  };

  private onPointerUp = (e: { button: number; offsetX: number; offsetY: number }) => {
    this.buttonsDown.delete(e.button);
    this.pointerX = e.offsetX;
    this.pointerY = e.offsetY;
    this.emit({
      type: 'pointerup',
      button: e.button,
      x: e.offsetX,
      y: e.offsetY,
      ndcX: this.toNdcX(e.offsetX),
      ndcY: this.toNdcY(e.offsetY),
    });
  };

  private onPointerMove = (e: { offsetX: number; offsetY: number }) => {
    this.pointerX = e.offsetX;
    this.pointerY = e.offsetY;
    this.emit({
      type: 'pointermove',
      x: e.offsetX,
      y: e.offsetY,
      ndcX: this.toNdcX(e.offsetX),
      ndcY: this.toNdcY(e.offsetY),
    });
  };

  constructor(element: InputTarget) {
    this.element = element;
    element.addEventListener('keydown', this.onKeyDown);
    element.addEventListener('keyup', this.onKeyUp);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointermove', this.onPointerMove);
  }

  private toNdcX(x: number): number {
    return (x / this.element.width) * 2 - 1;
  }

  private toNdcY(y: number): number {
    return 1 - (y / this.element.height) * 2;
  }

  private emit(event: InputEventData): void {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of set) fn(event);
    }
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  wasKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  isPointerDown(button = 0): boolean {
    return this.buttonsDown.has(button);
  }

  getPointerPosition(): { x: number; y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }

  getPointerNDC(): { x: number; y: number } {
    return { x: this.toNdcX(this.pointerX), y: this.toNdcY(this.pointerY) };
  }

  on(type: string, listener: InputListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  off(type: string, listener: InputListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  update(): void {
    this.keysPressed.clear();
  }

  dispose(): void {
    this.element.removeEventListener('keydown', this.onKeyDown);
    this.element.removeEventListener('keyup', this.onKeyUp);
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.keysDown.clear();
    this.keysPressed.clear();
    this.buttonsDown.clear();
    this.listeners.clear();
  }
}
