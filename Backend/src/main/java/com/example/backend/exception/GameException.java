package com.example.backend.exception;
public class GameException extends RuntimeException {
 private final String code; private final int status;
 public GameException(String message) {this("INVALID_ACTION",400,message);}
 public GameException(String code,int status,String message) {super(message);this.code=code;this.status=status;}
 public String getCode(){return code;} public int getStatus(){return status;}
}
