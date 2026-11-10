import { Pipe, PipeTransform } from '@angular/core';
import { PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS } from '../../core/constants/task.constants';
import { Role, TaskPriority, TaskStatus, User } from '../../core/models';

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: TaskStatus | null | undefined): string {
    return value ? STATUS_LABELS[value] : '';
  }
}

@Pipe({ name: 'priorityLabel' })
export class PriorityLabelPipe implements PipeTransform {
  transform(value: TaskPriority | null | undefined): string {
    return value ? PRIORITY_LABELS[value] : '';
  }
}

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(value: Role | null | undefined): string {
    return value ? ROLE_LABELS[value] : '';
  }
}

@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(
    user: Pick<User, 'firstname' | 'lastname'> | null | undefined,
    fallback = 'Utilisateur supprimé',
  ): string {
    return user ? `${user.firstname} ${user.lastname}` : fallback;
  }
}
