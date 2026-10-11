package com.example.backend.service;

import com.example.backend.scheduler.RoomCleanupScheduler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomCleanupSchedulerTest {

    @Mock
    private RoomService roomService;

    @InjectMocks
    private RoomCleanupScheduler scheduler;

    @Test
    void shouldInvokeCleanupInactiveRooms() {
        when(roomService.cleanupInactiveRooms(any(Duration.class))).thenReturn(2);

        // Manually trigger the scheduled method
        scheduler.cleanupInactiveRoomsTask();

        verify(roomService).cleanupInactiveRooms(Duration.ofHours(1));
    }
}