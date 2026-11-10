import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { SearchResult } from '../../core/models';
import { SearchService } from '../../core/services/api.services';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { StatusLabelPipe } from '../../shared/pipes/labels.pipe';

type SearchHit =
  | { kind: 'project'; id: number }
  | { kind: 'task'; id: number; projectId: number }
  | { kind: 'user'; id: number };

const EMPTY: SearchResult = { projects: [], tasks: [], users: [] };

/**
 * Recherche globale (projets, tâches, utilisateurs) :
 * debounceTime -> distinctUntilChanged -> switchMap (annule la requête précédente).
 */
@Component({
  selector: 'app-global-search',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatIconModule,
    AvatarComponent,
    StatusLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-box">
      <mat-icon>search</mat-icon>
      <input
        type="search"
        placeholder="Rechercher un projet, une tâche, un utilisateur…"
        [formControl]="query"
        [matAutocomplete]="auto"
        aria-label="Recherche globale"
        data-cy="global-search"
      />
    </div>
    <mat-autocomplete
      #auto="matAutocomplete"
      [displayWith]="displayNothing"
      (optionSelected)="select($event)"
      class="search-panel"
    >
      @if (results(); as r) {
        @if (r.projects.length) {
          <mat-optgroup label="Projets">
            @for (p of r.projects; track p.id) {
              <mat-option [value]="{ kind: 'project', id: p.id }">
                <mat-icon>folder</mat-icon> {{ p.name }}
                <small class="muted">· {{ p.workspaceName }}</small>
              </mat-option>
            }
          </mat-optgroup>
        }
        @if (r.tasks.length) {
          <mat-optgroup label="Tâches">
            @for (t of r.tasks; track t.id) {
              <mat-option [value]="{ kind: 'task', id: t.id, projectId: t.projectId }">
                <mat-icon>task_alt</mat-icon> {{ t.title }}
                <small class="muted">· {{ t.projectName }} · {{ t.status | statusLabel }}</small>
              </mat-option>
            }
          </mat-optgroup>
        }
        @if (r.users.length) {
          <mat-optgroup label="Utilisateurs">
            @for (u of r.users; track u.id) {
              <mat-option [value]="{ kind: 'user', id: u.id }" disabled class="user-option">
                <span class="user"
                  ><app-avatar [user]="u" [size]="24" /> {{ u.firstname }} {{ u.lastname }}
                  <small class="muted">· {{ u.email }}</small></span
                >
              </mat-option>
            }
          </mat-optgroup>
        }
        @if (!r.projects.length && !r.tasks.length && !r.users.length && hasTerm()) {
          <mat-option disabled>Aucun résultat</mat-option>
        }
      }
    </mat-autocomplete>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      background: var(--tf-surface-2);
      border: 1px solid transparent;
      transition: border-color 0.15s;
    }
    .search-box:focus-within {
      border-color: var(--mat-sys-primary);
    }
    .search-box mat-icon {
      color: var(--tf-muted);
    }
    input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      font: inherit;
      font-size: 14px;
      color: var(--tf-text);
    }
    .user {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--tf-text);
    }
  `,
})
export class GlobalSearchComponent {
  private readonly api = inject(SearchService);
  private readonly router = inject(Router);

  protected readonly query = new FormControl<string | SearchHit>('', { nonNullable: true });

  protected readonly results = toSignal(
    this.query.valueChanges.pipe(
      filter((v): v is string => typeof v === 'string'),
      map((v) => v.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < 2 ? of(EMPTY) : this.api.search(q).pipe(catchError(() => of(EMPTY))),
      ),
      startWith(EMPTY),
    ),
    { initialValue: EMPTY },
  );

  protected readonly displayNothing = () => '';

  protected hasTerm(): boolean {
    const v = this.query.value;
    return typeof v === 'string' && v.trim().length >= 2;
  }

  select(event: MatAutocompleteSelectedEvent): void {
    const hit = event.option.value as SearchHit;
    this.query.setValue('', { emitEvent: true });
    if (hit.kind === 'project') this.router.navigate(['/projects', hit.id]);
    else if (hit.kind === 'task')
      this.router.navigate(['/projects', hit.projectId, 'board'], {
        queryParams: { task: hit.id },
      });
  }
}
