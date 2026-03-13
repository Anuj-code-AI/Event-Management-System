package org.anuj.EvenTAura.exception;

public class MaxTicketReachedException extends RuntimeException {
    public MaxTicketReachedException(String message) {
        super(message);
    }
}
