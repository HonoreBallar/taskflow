import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Donne le focus à l'élément à son affichage (champ de réponse, recherche…). */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    setTimeout(() => this.el.nativeElement.focus());
  }
}
