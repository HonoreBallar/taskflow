import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models';

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as url) {
      <img
        [src]="url"
        [alt]="title()"
        [title]="title()"
        [style.width.px]="size()"
        [style.height.px]="size()"
      />
    } @else {
      <span
        class="initials"
        [title]="title()"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.font-size.px]="size() * 0.4"
        [style.background]="color()"
        >{{ initials() }}</span
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    img,
    .initials {
      border-radius: 50%;
      object-fit: cover;
    }
    .initials {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 600;
      user-select: none;
    }
  `,
})
export class AvatarComponent {
  readonly user = input<Pick<User, 'id' | 'firstname' | 'lastname' | 'avatarUrl'> | null>(null);
  readonly size = input(32);

  /** L'API renvoie un chemin relatif (/api/...) : on le rattache à apiUrl (utile si le backend est sur un autre domaine). */
  readonly src = computed(() => {
    const url = this.user()?.avatarUrl;
    return url?.startsWith('/api/') ? environment.apiUrl + url.substring(4) : url;
  });

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstname[0] ?? ''}${u.lastname[0] ?? ''}`.toUpperCase() : '?';
  });
  readonly title = computed(() => {
    const u = this.user();
    return u ? `${u.firstname} ${u.lastname}` : 'Non affecté';
  });
  readonly color = computed(() => {
    const u = this.user();
    return u ? COLORS[u.id % COLORS.length] : '#94a3b8';
  });
}
