package com.taskflow.security;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RateLimitCounterRepository extends JpaRepository<RateLimitCounter, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RateLimitCounter c where c.key = :key")
    Optional<RateLimitCounter> findForUpdate(@Param("key") String key);

    @Modifying
    @Query("delete from RateLimitCounter c where c.windowStart < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
