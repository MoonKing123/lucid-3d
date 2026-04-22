/**
 * KillFeed — 右上角滚动 kill 事件通知，最多 5 条，3s 后淡出。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIText } from '../../../../src/ui/ui-text';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars: new Map(),
};

const MAX_ENTRIES = 5;
const ENTRY_LIFETIME = 3.0;
const ENTRY_HEIGHT = 24;

export interface KillEntry {
  attackerId: string;
  victimId: string;
  weaponId: string;
  timeLeft: number;
  text: UIText;
}

export class KillFeed {
  readonly canvas: UICanvas;

  entries: KillEntry[] = [];

  private readonly _feedX: number;
  private readonly _feedY: number;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);
    this._feedX = width - 320;
    this._feedY = 210;
  }

  addKill(attackerId: string, victimId: string, weaponId = 'weapon'): void {
    while (this.entries.length >= MAX_ENTRIES) {
      const oldest = this.entries.shift();
      if (oldest) this.canvas.remove(oldest.text);
    }

    const idx = this.entries.length;
    const text = new UIText({
      font: STUB_FONT,
      text: `${attackerId} → ${victimId}`,
      x: this._feedX,
      y: this._feedY + idx * ENTRY_HEIGHT,
      color: vec3(1, 0.8, 0.3),
    });

    this.canvas.add(text);
    this.entries.push({ attackerId, victimId, weaponId, timeLeft: ENTRY_LIFETIME, text });
  }

  update(dt: number): void {
    for (const entry of this.entries) {
      entry.timeLeft -= dt;
      entry.text.opacity = Math.max(0, entry.timeLeft / ENTRY_LIFETIME);
    }

    const expired = this.entries.filter(e => e.timeLeft <= 0);
    for (const e of expired) {
      this.canvas.remove(e.text);
    }
    this.entries = this.entries.filter(e => e.timeLeft > 0);
  }
}
