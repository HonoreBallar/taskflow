package com.taskflow.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("""
            select distinct p from Project p join p.workspace w left join w.members m
            where w.owner.id = :userId or m.id = :userId
            order by p.createdAt desc
            """)
    List<Project> findAccessible(@Param("userId") Long userId);

    List<Project> findAllByOrderByCreatedAtDesc();

    List<Project> findByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    @Query("""
            select distinct p from Project p join p.workspace w left join w.members m
            where (:admin = true or w.owner.id = :userId or m.id = :userId)
              and lower(p.name) like lower(concat('%', :q, '%'))
            order by p.name
            """)
    List<Project> search(@Param("q") String q, @Param("userId") Long userId, @Param("admin") boolean admin);
}
