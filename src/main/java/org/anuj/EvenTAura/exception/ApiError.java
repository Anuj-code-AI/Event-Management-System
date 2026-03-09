package org.anuj.EvenTAura.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ApiError {

    private final String error;
    private final String message;
    private final LocalDateTime timestamp;

}