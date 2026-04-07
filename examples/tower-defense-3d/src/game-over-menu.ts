import { UIRect } from '../../../src/ui/ui-rect';
import { UIText } from '../../../src/ui/ui-text';
import { UIButton } from '../../../src/ui/ui-button';
import { vec3 } from '../../../src/math/vec3';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';

// 占位字体 — 仅满足类型约束，测试环境不进行实际渲染
const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

export class GameOverMenu {
  readonly background: UIRect;
  readonly title: UIText;
  readonly restartBtn: UIButton;
  visible: boolean = false;
  onRestart: (() => void) | null = null;

  constructor(opts: { width: number; height: number }) {
    this.background = new UIRect({
      x: 0,
      y: 0,
      width: opts.width,
      height: opts.height,
      color: vec3(0, 0, 0),
      opacity: 0.7,
    });

    this.title = new UIText({
      font: STUB_FONT,
      text: 'GAME OVER',
      x: opts.width / 2 - 80,
      y: opts.height / 2 - 60,
    });

    this.restartBtn = new UIButton({
      x: opts.width / 2 - 64,
      y: opts.height / 2,
      width: 128,
      height: 40,
      label: 'Restart',
    });
    this.restartBtn.onClick = () => this.onRestart?.();
  }

  show(): void { this.visible = true; }
  hide(): void { this.visible = false; }
}
