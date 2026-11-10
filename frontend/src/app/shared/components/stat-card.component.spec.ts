import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Tâches terminées');
    fixture.componentRef.setInput('value', 12);
    fixture.detectChanges();
  });

  it('affiche le libellé et la valeur (Inputs)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.value')?.textContent).toContain('12');
    expect(el.querySelector('.label')?.textContent).toContain('Tâches terminées');
  });

  it('émet (selected) au clic (Output)', () => {
    let clicked = false;
    fixture.componentInstance.selected.subscribe(() => (clicked = true));
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(clicked).toBeTrue();
  });
});
