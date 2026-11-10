import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Carte de statistique (Input/Output) : affiche une valeur et émet un clic pour naviguer vers le détail. */
@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="card" (click)="selected.emit()" [style.--accent]="color()">
      <span class="icon"
        ><mat-icon>{{ icon() }}</mat-icon></span
      >
      <span class="content">
        <span class="value">{{ value() }}</span>
        <span class="label">{{ label() }}</span>
      </span>
    </button>
  `,
  styles: `
    .card {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border: 1px solid var(--tf-border);
      border-radius: 16px;
      background: var(--tf-surface);
      cursor: pointer;
      text-align: left;
      color: inherit;
      font: inherit;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgb(15 23 42 / 8%);
    }
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
    }
    .content {
      display: flex;
      flex-direction: column;
    }
    .value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.1;
    }
    .label {
      color: var(--tf-muted);
      font-size: 14px;
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input('insights');
  readonly color = input('#6366f1');
  readonly selected = output<void>();
}
