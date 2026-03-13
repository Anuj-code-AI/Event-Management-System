package org.anuj.EvenTAura.controller;

import org.anuj.EvenTAura.util.SseEmitterHolder;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;// SSE endpoint that streams ticket updates

@RestController
public class SSEController{
    @GetMapping(value = "/api/v1/event/ticket-updates", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        SseEmitterHolder.add(emitter);
        emitter.onCompletion(() -> SseEmitterHolder.remove(emitter));
        emitter.onTimeout(() -> { emitter.complete(); SseEmitterHolder.remove(emitter); });
        emitter.onError(e -> SseEmitterHolder.remove(emitter));
        return emitter;
    }
}

