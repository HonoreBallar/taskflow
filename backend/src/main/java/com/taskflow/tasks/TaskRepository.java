package com.taskflow.tasks;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectIdOrderByStatusAscPositionAsc(Long projectId);

    List<Task> findByProjectIdAndStatusOrderByPositionAsc(Long projectId, TaskStatus status);

    List<Task> findByAssigneeIdOrderByDueDateAsc(Long assigneeId);

    @Query("select coalesce(max(t.position), -1) from Task t where t.project.id = :projectId and t.status = :status")
    int maxPosition(@Param("projectId") Long projectId, @Param("status") TaskStatus status);

    @Query("select t.project.id, t.status, count(t) from Task t where t.project.id in :ids group by t.project.id, t.status")
    List<Object[]> countByProjectAndStatus(@Param("ids") Collection<Long> ids);

    long countByProjectIdIn(Collection<Long> ids);

    long countByProjectIdInAndStatus(Collection<Long> ids, TaskStatus status);

    long countByProjectIdInAndBlockedTrueAndStatusNot(Collection<Long> ids, TaskStatus status);

    @Query("select count(t) from Task t where t.project.id in :ids and t.status <> com.taskflow.tasks.TaskStatus.DONE and t.dueDate < :today")
    long countOverdue(@Param("ids") Collection<Long> ids, @Param("today") LocalDate today);

    @Query("select t.status, count(t) from Task t where t.project.id in :ids group by t.status")
    List<Object[]> countByStatus(@Param("ids") Collection<Long> ids);

    @Query("""
            select t from Task t
            where t.project.id in :ids and lower(t.title) like lower(concat('%', :q, '%'))
            order by t.updatedAt desc
            """)
    List<Task> search(@Param("q") String q, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("update Task t set t.assignee = null where t.assignee.id = :userId")
    void unassignUser(@Param("userId") Long userId);

    @Modifying
    @Query("""
            update Task t set t.assignee = null
            where t.assignee.id = :userId
              and t.project.id in (select p.id from Project p where p.workspace.id = :workspaceId)
            """)
    void unassignUserInWorkspace(@Param("userId") Long userId, @Param("workspaceId") Long workspaceId);

    @Modifying
    @Query("update Task t set t.createdBy = null where t.createdBy.id = :userId")
    void clearCreator(@Param("userId") Long userId);
}
