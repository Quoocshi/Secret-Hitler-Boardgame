package com.example.backend.scheduler;

import com.example.backend.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RoomCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(RoomCleanupScheduler.class);
    private static final Duration MAX_IDLE_DURATION = Duration.ofHours(1);

    private final RoomService roomService;

    public RoomCleanupScheduler(RoomService roomService) {
        this.roomService = roomService;
    }

    @Scheduled(fixedRate = 900_000, initialDelay = 60_000)
    public void cleanupInactiveRoomsTask() {
        int removedRooms = roomService.cleanupInactiveRooms(MAX_IDLE_DURATION);
        if (removedRooms > 0) {
            log.info("Cleaned up {} inactive room(s) exceeding idle threshold of {} hours",
                    removedRooms, MAX_IDLE_DURATION.toHours());
        }
    }
}