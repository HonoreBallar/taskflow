import { FileSizePipe } from './file-size.pipe';
import { PriorityLabelPipe, StatusLabelPipe } from './labels.pipe';
import { MentionPipe } from './mention.pipe';
import { TimeAgoPipe } from './time-ago.pipe';

describe('MentionPipe', () => {
  const pipe = new MentionPipe();

  it('met en évidence les mentions', () => {
    expect(pipe.transform('Merci @honore !')).toBe('Merci <span class="mention">@honore</span> !');
  });

  it('échappe le HTML pour éviter les injections', () => {
    expect(pipe.transform('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('ne transforme pas les adresses email', () => {
    expect(pipe.transform('contact@ens.ci')).toBe('contact@ens.ci');
  });

  it('convertit les retours à la ligne', () => {
    expect(pipe.transform('a\nb')).toBe('a<br>b');
  });

  it('retourne une chaîne vide pour null', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-01-10T12:00:00Z').getTime();

  it("affiche « à l'instant » pour moins de 45 s", () => {
    expect(pipe.transform(new Date(now - 10_000), now)).toBe("à l'instant");
  });

  it('affiche les minutes, heures et jours', () => {
    expect(pipe.transform(new Date(now - 5 * 60_000), now)).toBe('il y a 5 min');
    expect(pipe.transform(new Date(now - 3 * 3_600_000), now)).toBe('il y a 3 h');
    expect(pipe.transform(new Date(now - 2 * 86_400_000), now)).toBe('il y a 2 j');
  });
});

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it('formate les tailles', () => {
    expect(pipe.transform(512)).toBe('512 o');
    expect(pipe.transform(2048)).toBe('2,0 Ko');
    expect(pipe.transform(5 * 1024 * 1024)).toBe('5,0 Mo');
    expect(pipe.transform(null)).toBe('');
  });
});

describe('Label pipes', () => {
  it('traduit statuts et priorités', () => {
    expect(new StatusLabelPipe().transform('IN_PROGRESS')).toBe('In Progress');
    expect(new PriorityLabelPipe().transform('CRITICAL')).toBe('Critique');
  });
});
