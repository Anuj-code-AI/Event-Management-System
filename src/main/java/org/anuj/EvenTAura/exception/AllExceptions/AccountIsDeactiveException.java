package org.anuj.EvenTAura.exception.AllExceptions;

public class AccountIsDeactiveException extends RuntimeException {
    public AccountIsDeactiveException(String message) {
        super(message);
    }
}
