import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';

/** Formulaire de commentaire réutilisé pour l'ajout, la réponse et la modification. */
@Component({
  selector: 'app-comment-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AutofocusDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit()" class="comment-form">
      <mat-form-field class="full-width">
        <mat-label>{{ placeholder() }}</mat-label>
        @if (autofocus()) {
          <textarea
            matInput
            [formControl]="control"
            rows="2"
            appAutofocus
            (keydown.control.enter)="submit()"
            data-cy="comment-input"
          ></textarea>
        } @else {
          <textarea
            matInput
            [formControl]="control"
            rows="2"
            (keydown.control.enter)="submit()"
            data-cy="comment-input"
          ></textarea>
        }
        <mat-hint>Mentionnez avec &#64;prénom · Ctrl+Entrée pour envoyer</mat-hint>
      </mat-form-field>
      <div class="actions">
        @if (cancellable()) {
          <button mat-button type="button" (click)="cancelled.emit()">Annuler</button>
        }
        <button mat-flat-button type="submit" [disabled]="control.invalid" data-cy="comment-submit">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .comment-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class CommentFormComponent implements OnInit {
  readonly initial = input('');
  readonly placeholder = input('Ajouter un commentaire');
  readonly submitLabel = input('Commenter');
  readonly cancellable = input(false);
  readonly autofocus = input(false);

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  protected readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(4000)],
  });

  ngOnInit(): void {
    this.control.setValue(this.initial());
  }

  submit(): void {
    const value = this.control.value.trim();
    if (!value) return;
    this.submitted.emit(value);
    this.control.reset('');
  }
}
