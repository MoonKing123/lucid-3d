import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIText } from '../../../src/ui/ui-text';
import { UIProgressBar } from '../../../src/ui/ui-progress-bar';
import { UIButton } from '../../../src/ui/ui-button';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';

/**
 * 最小字体存根：供无渲染环境（集成测试）使用，不依赖实际贴图。
 * UIText 要求 font 必填，渲染时需替换为真实 BitmapFontData。
 */
const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

export interface HUDState {
  score: number;
  healthMax: number;
  healthCurrent: number;
  paused: boolean;
}

export class HUD {
  readonly canvas: UICanvas;
  private scoreText: UIText;
  private healthBar: UIProgressBar;
  private pauseButton: UIButton;

  onPauseClicked: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    // 分数文字（左上角）
    this.scoreText = new UIText({
      name: 'scoreText',
      font: STUB_FONT,
      text: 'Score: 0',
      x: 20,
      y: 20,
      width: 200,
      height: 24,
    });

    // 暂停按钮（右上角）
    this.pauseButton = new UIButton({
      name: 'pauseButton',
      label: 'II',
      x: width - 60,
      y: 10,
      width: 40,
      height: 40,
    });
    this.pauseButton.onClick = () => this.onPauseClicked?.();

    // 血量条（左下角）
    this.healthBar = new UIProgressBar({
      name: 'healthBar',
      x: 20,
      y: height - 40,
      width: 200,
      height: 20,
      value: 1,
    });

    this.canvas.add(this.scoreText);
    this.canvas.add(this.pauseButton);
    this.canvas.add(this.healthBar);
  }

  update(state: HUDState): void {
    this.scoreText.text = `Score: ${state.score}`;
    this.healthBar.value = state.healthCurrent / state.healthMax;
  }
}
