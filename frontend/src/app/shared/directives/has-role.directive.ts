import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Role } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

/**
 * Directive structurelle : n'affiche le contenu que pour certains rôles.
 * Usage : <button *appHasRole="['ADMIN', 'MANAGER']">Créer</button>
 */
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  readonly appHasRole = input.required<Role[]>();
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.role() !== null && this.appHasRole().includes(this.auth.role()!);
      if (allowed && !this.rendered) {
        this.vcr.createEmbeddedView(this.tpl);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.vcr.clear();
        this.rendered = false;
      }
    });
  }
}
