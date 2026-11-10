import { Pipe, PipeTransform } from '@angular/core';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Échappe le texte puis met en évidence les mentions (@honore) et les retours à la ligne.
 * Usage : <p [innerHTML]="comment.content | mention"></p>
 */
@Pipe({ name: 'mention' })
export class MentionPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const escaped = value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
    return escaped
      .replace(/(^|\s)@([\p{L}0-9._-]+)/gu, '$1<span class="mention">@$2</span>')
      .replace(/\n/g, '<br>');
  }
}
