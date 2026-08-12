package com.stream.api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    @Value("${app.security.api-key}")
    private String apiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {



        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/videos")) {
            String requestKey = request.getHeader("X-API-KEY");
            if (requestKey == null || requestKey.isEmpty()) {
                requestKey = request.getParameter("apiKey");
            }

            if (apiKey == null || apiKey.isEmpty() || !apiKey.equals(requestKey)) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Unauthorized: Key is missing or wrong\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
