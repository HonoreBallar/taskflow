import { HttpEventType } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from '../../core/constants/task.constants';
import { Attachment } from '../../core/models';
import { AttachmentService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { DropZoneDirective } from '../../shared/directives/drop-zone.directive';
import { FullNamePipe } from '../../shared/pipes/labels.pipe';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { FilePreviewDialogComponent } from './file-preview-dialog.component';

interface Upload {
  id: number;
  name: string;
  progress: number;
}

let uploadSeq = 0;

@Component({
  selector: 'app-attachment-panel',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    DropZoneDirective,
    FileSizePipe,
    FullNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="drop"
      appDropZone
      role="button"
      tabindex="0"
      (filesDropped)="uploadAll($event)"
      (click)="input.click()"
      (keydown.enter)="input.click()"
      (keydown.space)="$event.preventDefault(); input.click()"
      data-cy="dropzone"
    >
      <mat-icon>cloud_upload</mat-icon>
      <span><strong>Cliquez</strong> ou glissez vos fichiers ici</span>
      <small class="muted">PDF, JPG, PNG, DOCX, XLSX · 20 Mo max</small>
      <input
        #input
        type="file"
        hidden
        multiple
        [accept]="accept"
        (change)="onSelect(input)"
        data-cy="file-input"
      />
    </div>

    @for (u of uploads(); track u.id) {
      <div class="upload">
        <span class="name">{{ u.name }}</span>
        <mat-progress-bar mode="determinate" [value]="u.progress" />
        <span class="pct">{{ u.progress }}%</span>
      </div>
    }

    <ul class="files">
      @for (a of attachments(); track a.id) {
        <li>
          <span class="icon" [class]="iconClass(a)"
            ><mat-icon>{{ icon(a) }}</mat-icon></span
          >
          <span class="info">
            <strong>{{ a.name }}</strong>
            <small class="muted"
              >{{ a.size | fileSize }} · {{ a.uploadedBy | fullName }} ·
              {{ a.createdAt | date: 'd MMM y, HH:mm' }}</small
            >
          </span>
          @if (a.previewable) {
            <button mat-icon-button (click)="preview(a)" matTooltip="Prévisualiser">
              <mat-icon>visibility</mat-icon>
            </button>
          }
          <button mat-icon-button (click)="download(a)" matTooltip="Télécharger">
            <mat-icon>download</mat-icon>
          </button>
          @if (canDelete(a)) {
            <button mat-icon-button (click)="remove(a)" matTooltip="Supprimer">
              <mat-icon>delete</mat-icon>
            </button>
          }
        </li>
      } @empty {
        @if (!loading() && !uploads().length) {
          <li class="none muted">Aucun fichier</li>
        }
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px 2px;
    }
    .drop {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 24px;
      border: 2px dashed var(--tf-border);
      border-radius: 14px;
      cursor: pointer;
      text-align: center;
      transition:
        border-color 0.15s,
        background 0.15s;
    }
    .drop:hover,
    .drop.dragover {
      border-color: var(--mat-sys-primary);
      background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
    }
    .drop mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--mat-sys-primary);
    }
    .upload {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 2fr 44px;
      gap: 10px;
      align-items: center;
      margin-top: 12px;
      font-size: 13px;
    }
    .upload .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .files {
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
    }
    .files li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--tf-border);
    }
    .files li:last-child {
      border-bottom: none;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .info strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .icon.pdf {
      background: #fee2e2;
      color: #b91c1c;
    }
    .icon.img {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .icon.doc {
      background: #e0e7ff;
      color: #4338ca;
    }
    .icon.xls {
      background: #d1fae5;
      color: #047857;
    }
    .none {
      justify-content: center;
      padding: 16px 0;
    }
  `,
})
export class AttachmentPanelComponent {
  private readonly api = inject(AttachmentService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly target = input.required<'tasks' | 'projects'>();
  readonly targetId = input.required<number>();
  readonly changed = output<void>();

  protected readonly accept = ALLOWED_FILE_EXTENSIONS.map((e) => '.' + e).join(',');
  protected readonly attachments = signal<Attachment[]>([]);
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly loading = signal(true);
  private readonly userId = computed(() => this.auth.currentUser()?.id);

  constructor() {
    effect(() => {
      const target = this.target();
      const id = this.targetId();
      untracked(() => this.load(target, id));
    });
  }

  private load(target: 'tasks' | 'projects', id: number): void {
    this.loading.set(true);
    const req$ = target === 'tasks' ? this.api.listForTask(id) : this.api.listForProject(id);
    req$.subscribe({
      next: (list) => {
        this.attachments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSelect(input: HTMLInputElement): void {
    this.uploadAll(Array.from(input.files ?? []));
    input.value = '';
  }

  uploadAll(files: File[]): void {
    files.forEach((f) => this.upload(f));
  }

  /** Upload avec suivi de progression via les HttpEvents (UploadProgress / Response). */
  private upload(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      this.toast.error(`Format non autorisé : ${file.name}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.toast.error(`${file.name} dépasse 20 Mo`);
      return;
    }

    const id = ++uploadSeq;
    this.uploads.update((l) => [...l, { id, name: file.name, progress: 0 }]);
    const setProgress = (progress: number) =>
      this.uploads.update((l) => l.map((u) => (u.id === id ? { ...u, progress } : u)));
    const done = () => this.uploads.update((l) => l.filter((u) => u.id !== id));

    this.api
      .upload(this.target(), this.targetId(), file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            setProgress(Math.round((100 * event.loaded) / event.total));
          } else if (event.type === HttpEventType.Response && event.body) {
            this.attachments.update((l) => [event.body!, ...l]);
            done();
            this.changed.emit();
          }
        },
        error: (err) => {
          done();
          this.toast.error(ToastService.messageOf(err, `Échec de l'envoi de ${file.name}`));
        },
      });
  }

  preview(a: Attachment): void {
    this.dialog.open(FilePreviewDialogComponent, {
      data: a,
      width: '960px',
      maxWidth: '96vw',
      height: '88vh',
    });
  }

  download(a: Attachment): void {
    this.api.download(a).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  canDelete(a: Attachment): boolean {
    return this.auth.isManager() || a.uploadedBy?.id === this.userId();
  }

  remove(a: Attachment): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer le fichier',
      message: `Supprimer « ${a.name} » ?`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(a.id)),
      )
      .subscribe({
        next: () => {
          this.attachments.update((l) => l.filter((x) => x.id !== a.id));
          this.changed.emit();
        },
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }

  icon(a: Attachment): string {
    if (a.contentType.startsWith('image/')) return 'image';
    if (a.contentType === 'application/pdf') return 'picture_as_pdf';
    if (a.contentType.includes('spreadsheet')) return 'table_chart';
    return 'description';
  }

  iconClass(a: Attachment): string {
    if (a.contentType.startsWith('image/')) return 'icon img';
    if (a.contentType === 'application/pdf') return 'icon pdf';
    if (a.contentType.includes('spreadsheet')) return 'icon xls';
    return 'icon doc';
  }
}
