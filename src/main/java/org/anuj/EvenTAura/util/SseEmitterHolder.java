package org.anuj.EvenTAura.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

// Holder to broadcast to all clients
@Component
public class SseEmitterHolder {
    private static final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public static void add(SseEmitter e)    { emitters.add(e); }
    public static void remove(SseEmitter e) { emitters.remove(e); }

    public static void broadcast(long eventId, int ticketsAvailable) {
        String data = "{\"eventId\":" + eventId + ",\"ticketsAvailable\":" + ticketsAvailable + "}";
        emitters.removeIf(e -> {
            try { e.send(SseEmitter.event().data(data)); return false; }
            catch (Exception ex) { return true; }
        });
    }

    // Add this method alongside your existing broadcast() for tickets
    public static void broadcastNewEvent(Object eventResponse) {
        try {
            // Convert your EventResponse object to JSON string
            ObjectMapper mapper = new ObjectMapper();
            String data = mapper.writeValueAsString(eventResponse);

            emitters.removeIf(emitter -> {
                try {
                    emitter.send(
                            SseEmitter.event()
                                    .name("new-event")   // named event — separate from ticket updates
                                    .data(data)
                    );
                    return false;
                } catch (Exception e) {
                    return true;
                }
            });
        } catch (JsonProcessingException e) {
            System.err.println("SSE serialization error: " + e.getMessage());
        }
    }
}
