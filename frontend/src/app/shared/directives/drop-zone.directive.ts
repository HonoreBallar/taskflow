import { Directive, HostBinding, HostListener, output } from '@angular/core';

/** Zone de glisser-déposer de fichiers : émet (filesDropped) et applique la classe .dragover au survol. */
@Directive({ selector: '[appDropZone]' })
export class DropZoneDirective {
  readonly filesDropped = output<File[]>();

  @HostBinding('class.dragover') dragover = false;

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragover = true;
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.dragover = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragover = false;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.filesDropped.emit(files);
  }
}
