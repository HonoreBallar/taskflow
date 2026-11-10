import { Comment } from '../../core/models';
import { buildCommentTree } from './comment-thread.component';

describe('buildCommentTree', () => {
  const c = (id: number, parentId: number | null): Comment => ({
    id,
    parentId,
    content: `c${id}`,
    author: null,
    taskId: 1,
    createdAt: '',
    updatedAt: null,
  });

  it('imbrique les réponses sous leur parent', () => {
    const tree = buildCommentTree([c(1, null), c(2, 1), c(3, 2), c(4, null)]);
    expect(tree.map((n) => n.id)).toEqual([1, 4]);
    expect(tree[0].replies[0].id).toBe(2);
    expect(tree[0].replies[0].replies[0].id).toBe(3);
  });

  it('remonte à la racine une réponse dont le parent est absent', () => {
    expect(buildCommentTree([c(5, 99)]).map((n) => n.id)).toEqual([5]);
  });
});
