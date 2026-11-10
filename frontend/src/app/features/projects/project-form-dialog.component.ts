import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, of, startWith, switchMap, take } from 'rxjs';
import { Project, ProjectRequest, User } from '../../core/models';
import { WorkspaceService } from '../../core/services/api.services';
import { ProjectsActions } from '../../store/projects/projects.actions';
import { dateRange, fromIsoDate, toIsoDate } from '../../shared/utils/validators';

export interface ProjectFormData {
  project?: Project;
  workspaceId?: number;
}

@Component({
  selector: 'app-project-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.project ? 'Modifier le projet' : 'Nouveau projet' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-col">
        <mat-form-field>
          <mat-label>Nom</mat-label>
          <input matInput formControlName="name" data-cy="project-name" />
          @if (form.controls.name.invalid) {
            <mat-error>Nom obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            data-cy="project-description"
          ></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Date début</mat-label>
            <input matInput [matDatepicker]="start" formControlName="startDate" />
            <mat-datepicker-toggle matIconSuffix [for]="start" />
            <mat-datepicker #start />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Date fin</mat-label>
            <input matInput [matDatepicker]="end" formControlName="endDate" />
            <mat-datepicker-toggle matIconSuffix [for]="end" />
            <mat-datepicker #end />
          </mat-form-field>
        </div>
        @if (form.hasError('dateRange')) {
          <small class="error">La date de fin doit être postérieure à la date de début</small>
        }

        <mat-form-field>
          <mat-label>Espace de travail</mat-label>
          <mat-select formControlName="workspaceId" data-cy="project-workspace">
            @for (ws of workspaces(); track ws.id) {
              <mat-option [value]="ws.id">{{ ws.name }}</mat-option>
            }
          </mat-select>
          @if (form.controls.workspaceId.invalid) {
            <mat-error>Workspace obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Membres</mat-label>
          <mat-select formControlName="memberIds" multiple>
            @for (m of members(); track m.id) {
              <mat-option [value]="m.id">{{ m.firstname }} {{ m.lastname }}</mat-option>
            }
          </mat-select>
          <mat-hint>Seuls les membres du workspace peuvent être ajoutés</mat-hint>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit" [disabled]="saving()" data-cy="project-save">
          Enregistrer
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .error {
      color: var(--tf-danger);
      margin-top: -8px;
    }
  `,
})
export class ProjectFormDialogComponent {
  protected readonly data = inject<ProjectFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ProjectFormDialogComponent, Project>);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly wsApi = inject(WorkspaceService);
  protected readonly saving = signal(false);

  private readonly p = this.data.project;

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: [this.p?.name ?? '', [Validators.required, Validators.maxLength(150)]],
      description: [this.p?.description ?? ''],
      startDate: [fromIsoDate(this.p?.startDate) as Date | null],
      endDate: [fromIsoDate(this.p?.endDate) as Date | null],
      workspaceId: [
        this.p?.workspaceId ?? this.data.workspaceId ?? (null as number | null),
        Validators.required,
      ],
      memberIds: [this.p?.members.map((m) => m.id) ?? ([] as number[])],
    },
    { validators: dateRange('startDate', 'endDate') },
  );

  protected readonly workspaces = toSignal(this.wsApi.list(), { initialValue: [] });

  /** Les membres proposés dépendent du workspace sélectionné (switchMap annule la requête précédente). */
  protected readonly members = toSignal(
    this.form.controls.workspaceId.valueChanges.pipe(
      startWith(this.form.controls.workspaceId.value),
      switchMap((id) =>
        id ? this.wsApi.members(id).pipe(catchError(() => of([] as User[]))) : of([] as User[]),
      ),
    ),
    { initialValue: [] as User[] },
  );

  constructor() {
    if (this.p) this.form.controls.workspaceId.disable();
  }

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    const body: ProjectRequest = {
      name: v.name.trim(),
      description: v.description || null,
      startDate: toIsoDate(v.startDate),
      endDate: toIsoDate(v.endDate),
      workspaceId: v.workspaceId!,
      memberIds: v.memberIds,
    };
    this.saving.set(true);

    // On attend la réponse (succès ou échec) de l'effet NgRx avant de fermer
    this.actions$
      .pipe(
        ofType(
          ProjectsActions.createProjectSuccess,
          ProjectsActions.updateProjectSuccess,
          ProjectsActions.projectFailure,
        ),
        take(1),
      )
      .subscribe((action) => {
        if (action.type === ProjectsActions.projectFailure.type) {
          this.saving.set(false);
        } else {
          this.ref.close(action.project);
        }
      });

    this.store.dispatch(
      this.p
        ? ProjectsActions.updateProject({ id: this.p.id, body })
        : ProjectsActions.createProject({ body }),
    );
  }
}
