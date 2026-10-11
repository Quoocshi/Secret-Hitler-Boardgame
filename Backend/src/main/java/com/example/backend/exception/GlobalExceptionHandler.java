package com.example.backend.exception;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import java.time.Instant;
@RestControllerAdvice
public class GlobalExceptionHandler {
 public record ErrorResponse(Instant timestamp,int status,String error,String code,String message) {}
 private ResponseEntity<ErrorResponse> response(int status,String code,String message) {return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ErrorResponse(Instant.now(),status,HttpStatus.valueOf(status).getReasonPhrase(),code,message));}
 @ExceptionHandler(GameException.class) public ResponseEntity<ErrorResponse> game(GameException e) {return response(e.getStatus(),e.getCode(),e.getMessage());}
 @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class,MissingRequestHeaderException.class,IllegalArgumentException.class})
 public ResponseEntity<ErrorResponse> validation(Exception e) {return response(400,"INVALID_PAYLOAD","Thông tin gửi lên không hợp lệ.");}
 @ExceptionHandler(Exception.class) public ResponseEntity<ErrorResponse> unexpected(Exception e) {return response(500,"SERVER_ERROR","Máy chủ chưa thể xử lý yêu cầu. Hãy thử đồng bộ lại.");}
 @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class) public ResponseEntity<ErrorResponse> missing(Exception e) {return response(404,"NOT_FOUND","Đường dẫn không tồn tại.");}
}
