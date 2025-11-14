package com.msbcgroup.mockinterview.util;

import java.util.HashMap;
import java.util.Map;

public class ResponseUtils {
    
    public static Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        return response;
    }
    
    public static Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = createSuccessResponse(message);
        response.put("data", data);
        return response;
    }
    
    public static Map<String, Object> createErrorResponse(String error) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        return response;
    }
    
    public static Map<String, String> createSimpleResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return response;
    }
}