import { Injectable, computed, inject, signal } from '@angular/core';
import { Project, User } from '../../core/models';
import { ProjectService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';

/**
 * Contexte du projet ouvert, fourni au niveau de ProjectDetailComponent :
 * les routes enfants (overview, board, documents, members) y accèdent par injection.
 */
@Injectable()
export class ProjectContextService {
  private readonly api = inject(ProjectService);
  private readonly auth = inject(AuthService);

  private readonly _project = signal<Project | null>(null);
  readonly project = this._project.asReadonly();
  readonly members = computed<User[]>(() => this._project()?.members ?? []);

  /** Un manager/admin peut gérer le projet (le contrôle définitif reste côté serveur). */
  readonly canManage = computed(() => this.auth.isManager());

  set(project: Project): void {
    this._project.set(project);
  }

  refresh(): void {
    const p = this._project();
    if (p) this.api.get(p.id).subscribe((fresh) => this._project.set(fresh));
  }
}
