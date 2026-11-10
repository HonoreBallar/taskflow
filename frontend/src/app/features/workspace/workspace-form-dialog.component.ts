import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Workspace } from '../../core/models';
import { WorkspaceService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workspace-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data ? 'Modifier le workspace' : 'Nouveau workspace' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-col">
        <mat-form-field>
          <mat-label>Nom</mat-label>
          <input matInput formControlName="name" placeholder="Entreprise ENS" data-cy="ws-name" />
          @if (form.controls.name.invalid) {
            <mat-error>Nom obligatoire</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit" [disabled]="saving()" data-cy="ws-save">
          Enregistrer
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class WorkspaceFormDialogComponent {
  protected readonly data = inject<Workspace | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<WorkspaceFormDialogComponent, Workspace>);
  private readonly api = inject(WorkspaceService);
  private readonly toast = inject(ToastService);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.data?.description ?? ''],
  });

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving.set(true);
    const body = this.form.getRawValue();
    const req$ = this.data ? this.api.update(this.data.id, body) : this.api.create(body);
    req$.subscribe({
      next: (ws) => {
        this.toast.success(this.data ? 'Workspace modifié' : 'Workspace créé');
        this.ref.close(ws);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(ToastService.messageOf(err));
      },
    });
  }
}
