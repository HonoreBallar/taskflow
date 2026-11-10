import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Validateur de groupe : vérifie que deux champs sont identiques (mot de passe / confirmation). */
export function matchFields(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    return a && b && a !== b ? { fieldsMismatch: true } : null;
  };
}

/** Validateur de groupe : la date de fin ne peut pas précéder la date de début. */
export function dateRange(startField: string, endField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startField)?.value;
    const end = group.get(endField)?.value;
    return start && end && new Date(end) < new Date(start) ? { dateRange: true } : null;
  };
}

/** Convertit une date (Date ou chaîne) en 'YYYY-MM-DD' sans décalage de fuseau horaire. */
export function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.substring(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse 'YYYY-MM-DD' en Date locale (évite le décalage UTC de new Date('YYYY-MM-DD')). */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}
