import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models';
import { AvatarComponent } from '../../shared/components/avatar.component';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink, DatePipe, MatIconModule, MatProgressBarModule, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = project();
    <a class="card" [routerLink]="['/projects', p.id]" data-cy="project-card">
      <div class="top">
        <span class="ws muted">{{ p.workspaceName }}</span>
        <ng-content />
      </div>
      <h3>{{ p.name }}</h3>
      <p class="desc muted">{{ p.description || 'Aucune description' }}</p>
      <div class="progress">
        <mat-progress-bar mode="determinate" [value]="p.progress" />
        <span>{{ p.progress }}%</span>
      </div>
      <div class="bottom">
        <div class="avatars">
          @for (m of p.members.slice(0, 4); track m.id) {
            <app-avatar [user]="m" [size]="26" />
          }
          @if (p.members.length > 4) {
            <span class="more">+{{ p.members.length - 4 }}</span>
          }
        </div>
        <span class="muted meta">
          <mat-icon inline>checklist</mat-icon> {{ p.doneCount }}/{{ p.taskCount }}
          @if (p.endDate) {
            · <mat-icon inline>event</mat-icon> {{ p.endDate | date: 'd MMM y' }}
          }
        </span>
      </div>
    </a>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      padding: 20px;
      background: var(--tf-surface);
      border: 1px solid var(--tf-border);
      border-radius: 16px;
      color: inherit;
      text-decoration: none;
      transition:
        transform 0.15s,
        box-shadow 0.15s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgb(15 23 42 / 8%);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    h3 {
      margin: 0;
      font-size: 17px;
    }
    .desc {
      margin: 0;
      font-size: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 40px;
    }
    .progress {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .progress mat-progress-bar {
      flex: 1;
      border-radius: 4px;
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 8px;
    }
    .avatars {
      display: flex;
    }
    .avatars app-avatar {
      margin-right: -6px;
      border: 2px solid var(--tf-surface);
      border-radius: 50%;
    }
    .more {
      font-size: 12px;
      margin-left: 10px;
      color: var(--tf-muted);
    }
    .meta {
      font-size: 13px;
    }
  `,
})
export class ProjectCardComponent {
  readonly project = input.required<Project>();
}
