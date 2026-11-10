package com.taskflow.admin;

import com.taskflow.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository repository;

    public void log(User actor, String action) {
        repository.save(ActivityLog.builder()
                .actorId(actor != null ? actor.getId() : null)
                .actorName(actor != null ? actor.getFullName() : "Système")
                .action(action)
                .build());
    }
}
