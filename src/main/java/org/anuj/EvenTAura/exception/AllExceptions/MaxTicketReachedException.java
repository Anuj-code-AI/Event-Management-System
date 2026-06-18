package org.anuj.EvenTAura.exception.AllExceptions;

public class MaxTicketReachedException extends RuntimeException {
    public MaxTicketReachedException(String message) {
        super(message);
    }
}
