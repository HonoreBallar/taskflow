import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Task } from '../../core/models';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { PriorityLabelPipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-task-card',
  imports: [DatePipe, MatIconModule, MatTooltipModule, AvatarComponent, PriorityLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = task();
    <article
      class="card"
      [class.blocked]="t.blocked"
      (click)="opened.emit(t)"
      (keydown.enter)="opened.emit(t)"
      tabindex="0"
      data-cy="task-card"
    >
      <div class="top">
        <span class="chip priority-{{ t.priority }}">{{ t.priority | priorityLabel }}</span>
        @if (t.blocked) {
          <span class="chip blocked-chip" matTooltip="Tâche bloquée"
            ><mat-icon inline>block</mat-icon> Bloquée</span
          >
        }
      </div>
      <h4>{{ t.title }}</h4>
      <div class="bottom">
        <span class="meta">
          @if (t.dueDate) {
            <span
              [class.overdue]="t.overdue"
              [matTooltip]="t.overdue ? 'En retard' : 'Date limite'"
            >
              <mat-icon inline>event</mat-icon> {{ t.dueDate | date: 'd MMM' }}
            </span>
          }
          @if (t.commentCount) {
            <span><mat-icon inline>chat_bubble_outline</mat-icon> {{ t.commentCount }}</span>
          }
          @if (t.attachmentCount) {
            <span><mat-icon inline>attach_file</mat-icon> {{ t.attachmentCount }}</span>
          }
        </span>
        <app-avatar [user]="t.assignee" [size]="26" />
      </div>
    </article>
  `,
  styles: `
    .card {
      background: var(--tf-surface);
      border: 1px solid var(--tf-border);
      border-radius: 12px;
      padding: 12px;
      cursor: grab;
      outline: none;
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .card:hover,
    .card:focus-visible {
      border-color: var(--mat-sys-primary);
      box-shadow: 0 4px 14px rgb(15 23 42 / 8%);
    }
    .card.blocked {
      border-left: 3px solid var(--tf-danger);
    }
    .top {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .blocked-chip {
      background: #fee2e2;
      color: #b91c1c;
    }
    h4 {
      margin: 8px 0 10px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      word-break: break-word;
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta {
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: var(--tf-muted);
    }
    .overdue {
      color: var(--tf-danger);
      font-weight: 600;
    }
  `,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
  /** Équivalent moderne d'un @Output() EventEmitter */
  readonly opened = output<Task>();
}
