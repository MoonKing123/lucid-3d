import { UIFlexContainer } from '../../../src/ui/ui-flex-container';
import { UIButton } from '../../../src/ui/ui-button';
import type { TowerType } from './tower';

export class TowerPalette {
  readonly container: UIFlexContainer;
  readonly arrowBtn: UIButton;
  readonly cannonBtn: UIButton;
  selectedType: TowerType = 'arrow';
  onSelect: ((type: TowerType) => void) | null = null;

  constructor(opts: { x: number; y: number }) {
    this.container = new UIFlexContainer({
      x: opts.x,
      y: opts.y,
      direction: 'horizontal',
      gap: 16,
    });

    this.arrowBtn = new UIButton({ width: 64, height: 64, label: 'Arrow' });
    this.cannonBtn = new UIButton({ width: 64, height: 64, label: 'Cannon' });

    this.arrowBtn.onClick = () => this.select('arrow');
    this.cannonBtn.onClick = () => this.select('cannon');

    this.container.add(this.arrowBtn);
    this.container.add(this.cannonBtn);
  }

  select(type: TowerType): void {
    this.selectedType = type;
    this.onSelect?.(type);
  }
}
