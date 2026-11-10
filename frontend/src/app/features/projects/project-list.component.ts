import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs';
import { PROJECT_VIEW_KEY } from '../../core/constants/storage.constants';
import { Project } from '../../core/models';
import { WorkspaceService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';
import { ProjectsActions } from '../../store/projects/projects.actions';
import { projectsFeature } from '../../store/projects/projects.reducer';
import { ProjectCardComponent } from './project-card.component';
import { ProjectFormDialogComponent, ProjectFormData } from './project-form-dialog.component';

type ViewMode = 'cards' | 'table';

@Component({
  selector: 'app-project-list',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatMenuModule,
    MatProgressBarModule,
    AvatarComponent,
    EmptyStateComponent,
    ProjectCardComponent,
    HasRoleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
})
export class ProjectListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Query params ?new=1&workspace=3 (ouverture directe du formulaire) */
  readonly new = input<string>();
  readonly workspace = input<string>();

  protected readonly projects = this.store.selectSignal(projectsFeature.selectProjects);
  protected readonly loading = this.store.selectSignal(projectsFeature.selectLoading);
  protected readonly workspaces = toSignal(inject(WorkspaceService).list(), { initialValue: [] });

  protected readonly view = signal<ViewMode>(this.readView());
  protected readonly search = signal('');
  protected readonly workspaceFilter = signal<number | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const ws = this.workspaceFilter();
    return this.projects().filter(
      (p) =>
        (!ws || p.workspaceId === ws) &&
        (!q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
    );
  });

  protected readonly columns = [
    'name',
    'workspace',
    'progress',
    'tasks',
    'members',
    'endDate',
    'actions',
  ];

  /** TrackBy du mat-table : évite de recréer les lignes à chaque mise à jour du store. */
  protected readonly trackById = (_: number, p: Project) => p.id;

  ngOnInit(): void {
    this.store.dispatch(ProjectsActions.loadProjects({}));
    if (this.new() && this.auth.isManager()) {
      this.openForm(undefined, this.workspace() ? +this.workspace()! : undefined);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  setView(view: ViewMode): void {
    this.view.set(view);
    try {
      localStorage.setItem(PROJECT_VIEW_KEY, view);
    } catch {
      /* stockage indisponible */
    }
  }

  openForm(project?: Project, workspaceId?: number): void {
    const data: ProjectFormData = { project, workspaceId };
    this.dialog
      .open(ProjectFormDialogComponent, { data, width: '560px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter((p): p is Project => !!p && !project))
      .subscribe((p) => this.router.navigate(['/projects', p.id]));
  }

  remove(project: Project): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer le projet',
      message: `Supprimer « ${project.name} » et toutes ses tâches ?`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(filter(Boolean))
      .subscribe(() => this.store.dispatch(ProjectsActions.deleteProject({ id: project.id })));
  }

  private readView(): ViewMode {
    try {
      return localStorage.getItem(PROJECT_VIEW_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  }
}
