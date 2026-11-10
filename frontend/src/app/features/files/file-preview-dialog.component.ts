import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Attachment } from '../../core/models';
import { AttachmentService } from '../../core/services/api.services';

/** Prévisualisation PDF / image : le fichier est récupéré en Blob (avec le JWT) puis affiché via une URL locale. */
@Component({
  selector: 'app-file-preview-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h2>{{ data.name }}</h2>
      <button mat-icon-button mat-dialog-close aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <div class="viewer">
      @if (url(); as u) {
        @if (isImage) {
          <img [src]="u" [alt]="data.name" />
        } @else {
          <iframe [src]="u" [title]="data.name"></iframe>
        }
      } @else {
        <mat-spinner diameter="40" />
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 8px 20px;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .viewer {
      flex: 1;
      display: grid;
      place-items: center;
      background: var(--tf-surface-2);
      overflow: auto;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
  `,
})
export class FilePreviewDialogComponent implements OnDestroy {
  protected readonly data = inject<Attachment>(MAT_DIALOG_DATA);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly isImage = this.data.contentType.startsWith('image/');
  protected readonly url = signal<SafeResourceUrl | null>(null);
  private objectUrl: string | null = null;

  constructor() {
    inject(AttachmentService)
      .download(this.data, true)
      .subscribe((blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      });
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
