import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';
import { Comment, CommentNode } from '../../core/models';
import { CommentService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CommentFormComponent } from './comment-form.component';
import { CommentEvent, CommentItemComponent } from './comment-item.component';

/** Construit l'arbre des commentaires (réponses imbriquées) à partir de la liste plate de l'API. */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>();
  comments.forEach((c) => nodes.set(c.id, { ...c, replies: [] }));
  const roots: CommentNode[] = [];
  nodes.forEach((n) => {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.replies.push(n);
    else roots.push(n);
  });
  return roots;
}

@Component({
  selector: 'app-comment-thread',
  imports: [CommentFormComponent, CommentItemComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="thread">
      <app-comment-form (submitted)="add($event)" />
      @for (c of tree(); track c.id) {
        <app-comment-item
          [comment]="c"
          (replied)="reply($event)"
          (edited)="edit($event)"
          (deleted)="remove($event)"
        />
      } @empty {
        @if (!loading()) {
          <app-empty-state
            icon="forum"
            title="Aucun commentaire"
            message="Lancez la discussion !"
          />
        }
      }
    </div>
  `,
  styles: `
    .thread {
      padding: 16px 2px;
    }
  `,
})
export class CommentThreadComponent {
  private readonly api = inject(CommentService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly taskId = input.required<number>();
  /** Émis après chaque modification pour rafraîchir le compteur de la tâche */
  readonly changed = output<void>();

  private readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(true);
  protected readonly tree = computed(() => buildCommentTree(this.comments()));

  constructor() {
    effect(() => {
      const id = this.taskId();
      untracked(() => {
        this.loading.set(true);
        this.api.list(id).subscribe({
          next: (list) => {
            this.comments.set(list);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      });
    });
  }

  add(content: string): void {
    this.api.create(this.taskId(), content).subscribe({
      next: (c) => {
        this.comments.update((l) => [...l, c]);
        this.changed.emit();
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  reply({ comment, content }: CommentEvent): void {
    this.api.create(this.taskId(), content, comment.id).subscribe({
      next: (c) => {
        this.comments.update((l) => [...l, c]);
        this.changed.emit();
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  edit({ comment, content }: CommentEvent): void {
    this.api.update(comment.id, content).subscribe({
      next: (c) => this.comments.update((l) => l.map((x) => (x.id === c.id ? c : x))),
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  remove(comment: CommentNode): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer le commentaire',
      message: comment.replies.length
        ? 'Le commentaire et ses réponses seront supprimés.'
        : 'Supprimer ce commentaire ?',
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(comment.id)),
      )
      .subscribe({
        next: () => {
          // Retire le commentaire et toute sa descendance
          const removed = new Set<number>([comment.id]);
          const collect = (n: CommentNode) =>
            n.replies.forEach((r) => (removed.add(r.id), collect(r)));
          collect(comment);
          this.comments.update((l) => l.filter((c) => !removed.has(c.id)));
          this.changed.emit();
        },
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }
}
