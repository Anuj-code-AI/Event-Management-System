package org.anuj.EvenTAura.exception;


import org.anuj.EvenTAura.exception.AllExceptions.*;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Catches generic exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // You can add more specific handlers here (e.g., UserNotFoundException)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Email already exist exception
    @ExceptionHandler(EmailAlreadyExistException.class)
    public ResponseEntity<ApiResponse<Void>> handleEmailAlreadyExistException(EmailAlreadyExistException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // User not found Exception
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserNotFoundException(UserNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // invalid password Exception
    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidPasswordException(InvalidPasswordException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // handle validation
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {

        Map<String,String> errors = new HashMap<>();

        ex.getBindingResult().getFieldErrors()
                .forEach(error ->
                        errors.put(error.getField(), error.getDefaultMessage())
                );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(errors);
    }

    // Event not found exception
    @ExceptionHandler(EventNotExistException.class)
    public ResponseEntity<ApiResponse<Void>> handleEventNotFound(EventNotExistException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // No ticket found exception
    @ExceptionHandler(NoTicketFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoTicketFound(NoTicketFoundException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Max ticket reached exception
    @ExceptionHandler(MaxTicketReachedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxTicketReachedException(MaxTicketReachedException ex){
        return ResponseEntity
                .status(HttpStatus.REQUEST_TIMEOUT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Event not found exception
    @ExceptionHandler(NoEventFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoEventFoundException(NoEventFoundException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // University not found exception
    @ExceptionHandler(UniversityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleUniversityNotFoundException(UniversityNotFoundException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // University not supported exception
    @ExceptionHandler(UniversityNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUniversityNotSupportedException(UniversityNotSupportedException ex){
        return ResponseEntity
                .status(HttpStatus.UNAVAILABLE_FOR_LEGAL_REASONS)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Access denied Exception
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ex.getMessage()));
    }

}
