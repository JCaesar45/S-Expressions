package com.example.sexpr;

/**
 * Raised when an S-expression is structurally malformed.
 */
public class SExprError extends RuntimeException {

    private final int position;

    public SExprError(String message, int position) {
        super(message + " at position " + position);
        this.position = position;
    }

    public int getPosition() {
        return position;
    }
}
