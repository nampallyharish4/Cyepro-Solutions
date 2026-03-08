package com.cyepro.engine.dto;

import java.util.UUID;

public class LoginResponse {

    private String token;
    private UserInfo user;

    public LoginResponse(String token, UUID id, String email, String role) {
        this.token = token;
        this.user = new UserInfo(id, email, role);
    }

    public String getToken() { return token; }
    public UserInfo getUser() { return user; }

    public record UserInfo(UUID id, String email, String role) {}
}
