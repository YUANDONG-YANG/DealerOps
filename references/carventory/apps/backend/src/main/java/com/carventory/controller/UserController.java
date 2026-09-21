package com.carventory.controller;

import com.carventory.dto.*;
import com.carventory.entity.Company;
import com.carventory.entity.User;
import com.carventory.service.CompanyService;
import com.carventory.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final CompanyService companyService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@ModelAttribute UserDTO userDTO) {
       Company company = companyService.saveCompany(userDTO);
        ResponseEntity<String> response = userService.registerUser(userDTO,company);
        return response;
    }

    @PostMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestBody String token) {
        if (token == null || token.trim().isEmpty()) {
            logger.error("Received empty or null token for email verification");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Token cannot be empty");
        }
        logger.info("Verifying email with token: {}", token);
        return userService.verifyEmail(token.trim());
    }

    @PostMapping("/create")
    public ResponseEntity<String> createUser(@RequestBody UserDTO userDTO) {
        logger.info("Creating user with email: {}", userDTO.getEmail());
        return userService.createUser(userDTO);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<String> updateUser(@PathVariable Long userId, @RequestBody UserDTO userDTO) {
        userService.updateUser(userId, userDTO);
        return ResponseEntity.ok("User updated successfully");
    }

    @DeleteMapping("/delete/{userId}")
    public ResponseEntity<String> deleteUser(@PathVariable Long userId) {
        userService.softDeleteUser(userId);
        return ResponseEntity.ok("User deleted successfully");
    }

    @Transactional
    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserByIdIfActive(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getUserByIdIfActive(userId));
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(@RequestBody ChangePasswordDTO request) {
        return userService.changeUserPassword(request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordDTO request) {
        return userService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordDTO request) {
        return userService.resetPassword(request);
    }

    @GetMapping("/has-users")
    public ResponseEntity<Boolean> hasUsers() {
        boolean hasUsers = userService.hasAnyUsers();
        return ResponseEntity.ok(hasUsers);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyInfo() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        if (userInfo != null) {
            return ResponseEntity.ok(userInfo);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
    }
}