/**
 * HUD 集成测试 — Issue #214
 *
 * 测试 HUD 的分数显示、血量条比例、暂停按钮回调，
 * 以及 FollowCamera 的阻尼跟随行为。
 *
 * API 对齐说明：
 * - UIText 必须传 font: BitmapFontData，HUD 内部使用 STUB_FONT
 * - UIButton 构造参数用 label（非 text）
 * - FollowCamera.projectionMatrix 是 getter，无 updateProjection() 方法
 * - FollowCamera.update(0) 因 dt===0 提前返回，相机不移动
 */
import { describe, it, expect } from 'vitest';
import { HUD } from '../../src/hud';
import { UIText } from '../../../../src/ui/ui-text';
import { UIProgressBar } from '../../../../src/ui/ui-progress-bar';
import { UIButton } from '../../../../src/ui/ui-button';
import { Player } from '../../src/player';
import { createPlayerFollowCamera } from '../../src/camera-rig';

describe('HUD 集成', () => {
  it('初始 score 显示 0', () => {
    const hud = new HUD(800, 600);
    hud.update({ score: 0, healthMax: 100, healthCurrent: 100, paused: false });
    const scoreText = hud.canvas.findByName('scoreText') as UIText;
    expect(scoreText.text).toContain('0');
  });

  it('score 更新后文字内容更新', () => {
    const hud = new HUD(800, 600);
    hud.update({ score: 1234, healthMax: 100, healthCurrent: 100, paused: false });
    const scoreText = hud.canvas.findByName('scoreText') as UIText;
    expect(scoreText.text).toContain('1234');
  });

  it('血量条 value 反映 current / max 比例', () => {
    const hud = new HUD(800, 600);
    hud.update({ score: 0, healthMax: 100, healthCurrent: 50, paused: false });
    const healthBar = hud.canvas.findByName('healthBar') as UIProgressBar;
    expect(healthBar.value).toBeCloseTo(0.5);
  });

  it('暂停按钮点击触发回调', () => {
    const hud = new HUD(800, 600);
    let clicked = false;
    hud.onPauseClicked = () => { clicked = true; };
    // 直接调用按钮的 onClick（等同于 handlePointerUp 内部逻辑）
    const btn = hud.canvas.findByName('pauseButton') as UIButton;
    btn.onClick?.();
    expect(clicked).toBe(true);
  });
});

describe('FollowCamera 跟随玩家', () => {
  it('玩家移动后相机渐进跟上', () => {
    const player = new Player({ startPosition: [0, 0, 0] });
    const cam = createPlayerFollowCamera(player);
    cam.update(0); // dt===0 时 FollowCamera 不更新位置，相机仍在原点
    const camPos0 = [...cam.position];

    // 玩家移动到 z=10
    player.node.position[2] = 10;

    // 跑 60 帧（dt=1/60）让相机阻尼跟随
    for (let i = 0; i < 60; i++) cam.update(1 / 60);

    // 理想位置 z = 10 + offset.z(-8) = 2，应大于初始 z=0
    expect(cam.position[2]).toBeGreaterThan(camPos0[2]);
  });

  it('damping 为 0 时一帧内跟上理想位置', () => {
    const player = new Player({ startPosition: [0, 0, 0] });
    const cam = createPlayerFollowCamera(player);
    cam.damping = 0; // t = 1 - 0^(dt*60) = 1，瞬间跟上
    player.node.position[2] = 10;
    cam.update(0.016);
    // 理想位置 z = 10 + (-8) = 2
    expect(cam.position[2]).toBeCloseTo(2, 1);
  });
});
