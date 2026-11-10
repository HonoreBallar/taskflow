import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-icon>{{ icon() }}</mat-icon>
    <h3>{{ title() }}</h3>
    @if (message()) {
      <p>{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 16px;
      color: var(--tf-muted);
    }
    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.6;
    }
    h3 {
      margin: 12px 0 4px;
      color: var(--tf-text);
      font-weight: 600;
    }
    p {
      margin: 0 0 16px;
      max-width: 420px;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
