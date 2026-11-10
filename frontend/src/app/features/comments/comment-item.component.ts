import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommentNode } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { FullNamePipe } from '../../shared/pipes/labels.pipe';
import { MentionPipe } from '../../shared/pipes/mention.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { CommentFormComponent } from './comment-form.component';

export interface CommentEvent {
  comment: CommentNode;
  content: string;
}

/** Commentaire récursif : affiche ses réponses avec le même composant. */
@Component({
  selector: 'app-comment-item',
  imports: [
    MatButtonModule,
    MatIconModule,
    AvatarComponent,
    CommentFormComponent,
    FullNamePipe,
    MentionPipe,
    TimeAgoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = comment();
    <div class="comment" [attr.data-cy]="'comment-' + c.id">
      <app-avatar [user]="c.author" [size]="32" />
      <div class="bubble-wrap">
        @if (editing()) {
          <app-comment-form
            [initial]="c.content"
            submitLabel="Enregistrer"
            [cancellable]="true"
            [autofocus]="true"
            (submitted)="edited.emit({ comment: c, content: $event }); editing.set(false)"
            (cancelled)="editing.set(false)"
          />
        } @else {
          <div class="bubble">
            <div class="meta">
              <strong>{{ c.author | fullName }}</strong>
              <span class="muted"
                >{{ c.createdAt | timeAgo }}
                @if (c.updatedAt) {
                  · modifié
                }
              </span>
            </div>
            <p [innerHTML]="c.content | mention"></p>
          </div>
          <div class="actions">
            @if (depth() < 3) {
              <button mat-button (click)="replying.set(!replying())">
                <mat-icon>reply</mat-icon>Répondre
              </button>
            }
            @if (isAuthor()) {
              <button mat-button (click)="editing.set(true)">
                <mat-icon>edit</mat-icon>Modifier
              </button>
            }
            @if (isAuthor() || auth.isAdmin()) {
              <button mat-button (click)="deleted.emit(c)">
                <mat-icon>delete</mat-icon>Supprimer
              </button>
            }
          </div>
        }

        @if (replying()) {
          <app-comment-form
            [placeholder]="'Répondre à ' + (c.author?.firstname ?? '')"
            [initial]="c.author ? '@' + c.author.firstname + ' ' : ''"
            submitLabel="Répondre"
            [cancellable]="true"
            [autofocus]="true"
            (submitted)="replied.emit({ comment: c, content: $event }); replying.set(false)"
            (cancelled)="replying.set(false)"
          />
        }

        @if (c.replies.length) {
          <div class="replies">
            @for (r of c.replies; track r.id) {
              <app-comment-item
                [comment]="r"
                [depth]="depth() + 1"
                (replied)="replied.emit($event)"
                (edited)="edited.emit($event)"
                (deleted)="deleted.emit($event)"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .comment {
      display: flex;
      gap: 10px;
      padding-top: 12px;
    }
    .bubble-wrap {
      flex: 1;
      min-width: 0;
    }
    .bubble {
      background: var(--tf-surface-2);
      border-radius: 4px 14px 14px 14px;
      padding: 10px 14px;
    }
    .meta {
      display: flex;
      gap: 8px;
      align-items: baseline;
      font-size: 13px;
      flex-wrap: wrap;
    }
    p {
      margin: 4px 0 0;
      line-height: 1.5;
      word-break: break-word;
    }
    .actions {
      display: flex;
      gap: 2px;
      margin-top: 2px;
    }
    .actions button {
      --mat-text-button-horizontal-padding: 8px;
      font-size: 12px;
      height: 28px;
    }
    .actions mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .replies {
      border-left: 2px solid var(--tf-border);
      padding-left: 12px;
      margin-top: 4px;
    }
  `,
})
export class CommentItemComponent {
  protected readonly auth = inject(AuthService);

  readonly comment = input.required<CommentNode>();
  readonly depth = input(0);

  readonly replied = output<CommentEvent>();
  readonly edited = output<CommentEvent>();
  readonly deleted = output<CommentNode>();

  protected readonly replying = signal(false);
  protected readonly editing = signal(false);
  protected readonly isAuthor = computed(
    () => this.comment().author?.id === this.auth.currentUser()?.id,
  );
}
