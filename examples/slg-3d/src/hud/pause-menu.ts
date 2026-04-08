/**
 * PauseMenu — 暂停菜单覆盖层。
 * ESC 键弹出/关闭，包含 Resume / Restart / Back to Menu 三个按钮。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIText } from '../../../../src/ui/ui-text';
import { UIButton } from '../../../../src/ui/ui-button';
import { UIFlexContainer } from '../../../../src/ui/ui-flex-container';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

const BTN_WIDTH  = 180;
const BTN_HEIGHT = 44;

export class PauseMenu {
  readonly canvas: UICanvas;
  readonly overlay: UIRect;
  readonly title: UIText;
  readonly buttonContainer: UIFlexContainer;
  readonly resumeBtn: UIButton;
  readonly restartBtn: UIButton;
  readonly backToMenuBtn: UIButton;

  visible: boolean = false;

  onResume:     (() => void) | null = null;
  onRestart:    (() => void) | null = null;
  onBackToMenu: (() => void) | null = null;

  constructor(opts: { width: number; height: number }) {
    this.canvas = new UICanvas(opts.width, opts.height);

    // 全屏半透明遮罩
    this.overlay = new UIRect({
      x: 0,
      y: 0,
      width: opts.width,
      height: opts.height,
      color: vec3(0, 0, 0),
      opacity: 0.65,
    });

    // 标题
    this.title = new UIText({
      font: STUB_FONT,
      text: '暂停',
      x: opts.width / 2 - 30,
      y: opts.height / 2 - 100,
      color: vec3(1, 1, 1),
    });

    // 按钮列（垂直布局）
    this.buttonContainer = new UIFlexContainer({
      x: opts.width / 2 - BTN_WIDTH / 2,
      y: opts.height / 2 - 60,
      width: BTN_WIDTH,
      height: BTN_HEIGHT * 3 + 12 * 2,
      direction: 'vertical',
      gap: 12,
      padding: 0,
    });

    this.resumeBtn = new UIButton({
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: 'Resume',
      normalColor: vec3(0.2, 0.5, 0.2),
    });
    this.resumeBtn.onClick = () => this.onResume?.();

    this.restartBtn = new UIButton({
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: 'Restart',
      normalColor: vec3(0.4, 0.4, 0.4),
    });
    this.restartBtn.onClick = () => this.onRestart?.();

    this.backToMenuBtn = new UIButton({
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: 'Back to Menu',
      normalColor: vec3(0.5, 0.2, 0.2),
    });
    this.backToMenuBtn.onClick = () => this.onBackToMenu?.();

    this.buttonContainer.add(this.resumeBtn);
    this.buttonContainer.add(this.restartBtn);
    this.buttonContainer.add(this.backToMenuBtn);

    this.canvas.add(this.overlay);
    this.canvas.add(this.title);
    this.canvas.add(this.buttonContainer);

    // 默认隐藏
    this.canvas.children.forEach(c => { c.visible = false; });
  }

  show(): void {
    this.visible = true;
    this.canvas.children.forEach(c => { c.visible = true; });
  }

  hide(): void {
    this.visible = false;
    this.canvas.children.forEach(c => { c.visible = false; });
  }

  /** 切换可见性（ESC 键调用） */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
