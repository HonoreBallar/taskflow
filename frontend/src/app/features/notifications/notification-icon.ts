import { NotificationType } from '../../core/models';

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  TASK_CREATED: 'add_task',
  TASK_ASSIGNED: 'assignment_ind',
  COMMENT_ADDED: 'chat',
  MENTION: 'alternate_email',
  WORKSPACE_INVITATION: 'group_add',
  PROJECT_INVITATION: 'folder_shared',
};
