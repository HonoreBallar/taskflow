import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AttachmentPanelComponent } from '../files/attachment-panel.component';
import { ProjectContextService } from './project-context.service';

@Component({
  selector: 'app-project-documents',
  imports: [AttachmentPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ctx.project(); as p) {
      <div class="panel">
        <h2>Documents du projet</h2>
        <app-attachment-panel target="projects" [targetId]="p.id" />
      </div>
    }
  `,
  styles: `
    h2 {
      margin: 0 0 16px;
      font-size: 17px;
    }
  `,
})
export class ProjectDocumentsComponent {
  protected readonly ctx = inject(ProjectContextService);
}
