import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService } from '../../core/services/api.services';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Administration</h1>
        <p>Utilisateurs, rôles et journal des actions.</p>
      </div>
    </div>

    @if (stats(); as s) {
      <div class="stats">
        <div>
          <strong>{{ s.users }}</strong
          ><span>Utilisateurs</span>
        </div>
        <div>
          <strong>{{ s.admins }} / {{ s.managers }} / {{ s.collaborators }}</strong
          ><span>Admins / Managers / Collab.</span>
        </div>
        <div>
          <strong>{{ s.workspaces }}</strong
          ><span>Workspaces</span>
        </div>
        <div>
          <strong>{{ s.projects }}</strong
          ><span>Projets</span>
        </div>
        <div>
          <strong>{{ s.doneTasks }} / {{ s.tasks }}</strong
          ><span>Tâches terminées</span>
        </div>
      </div>
    }

    <nav mat-tab-nav-bar [tabPanel]="panel">
      <a
        mat-tab-link
        routerLink="users"
        routerLinkActive
        #u="routerLinkActive"
        [active]="u.isActive"
        ><mat-icon>group</mat-icon>&nbsp;Utilisateurs</a
      >
      <a mat-tab-link routerLink="logs" routerLinkActive #l="routerLinkActive" [active]="l.isActive"
        ><mat-icon>history</mat-icon>&nbsp;Journal</a
      >
    </nav>
    <mat-tab-nav-panel #panel
      ><div class="outlet"><router-outlet /></div
    ></mat-tab-nav-panel>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stats div {
      display: flex;
      flex-direction: column;
      padding: 16px;
      border-radius: 14px;
      background: var(--tf-surface);
      border: 1px solid var(--tf-border);
    }
    .stats strong {
      font-size: 22px;
    }
    .stats span {
      color: var(--tf-muted);
      font-size: 13px;
    }
    .outlet {
      padding-top: 16px;
    }
  `,
})
export class AdminShellComponent {
  protected readonly stats = toSignal(inject(AdminService).stats());
}
