package com.taskflow.workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    @Query("""
            select distinct w from Workspace w left join w.members m
            where w.owner.id = :userId or m.id = :userId
            order by w.name
            """)
    List<Workspace> findAccessible(@Param("userId") Long userId);

    List<Workspace> findAllByOrderByNameAsc();

    boolean existsByOwnerId(Long ownerId);
}
