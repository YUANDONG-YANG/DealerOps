package com.carventory.service;

import com.carventory.dto.*;
import com.carventory.entity.*;
import com.carventory.helper.UserHelper;
import com.carventory.repository.EmailVerificationTokenRepository;
import com.carventory.repository.PasswordHistoryRepository;
import com.carventory.repository.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordHistoryRepository passwordHistoryRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private UserHelper userHelper;

    // Cache to track email reset requests (email -> timestamp)
    private final Cache<String, Long> resetRequestCache = Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS) // 1-hour limit
            .maximumSize(1000)
            .build();

    public UserService(
            UserRepository userRepository,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            JavaMailSender mailSender,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ResponseEntity<String> registerUser(UserDTO userDTO, Company company) {
        Optional<String> validationError = userHelper.validateUserInput(userDTO);
        if (validationError.isPresent()) {
            logger.error("Validation error for email {}: {}", userDTO.getEmail(), validationError.get());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationError.get());
        }

        User user = userHelper.createUserFromDTO(userDTO,company);
        userRepository.save(user);
        logger.info("User saved with email: {}", user.getEmail());

        userHelper.sendVerificationToken(user);
        return ResponseEntity.ok("Verification email sent successfully");
    }

    @Transactional
    public ResponseEntity<String> verifyEmail(String token) {
        Optional<EmailVerificationToken> optionalToken = userHelper.validateAndGetToken(token);
        if (optionalToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired verification token");
        }

        EmailVerificationToken verificationToken = optionalToken.get();

        Optional<User> optionalUser = userHelper.validateUserFromToken(verificationToken);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = optionalUser.get();
        if (user.isActive()) {
            userHelper.deleteTokenSafely(verificationToken);
            return ResponseEntity.ok("Email already verified");
        }

        userHelper.activateUser(user);
        userHelper.deleteTokenSafely(verificationToken);

        return ResponseEntity.ok("Email verified successfully");
    }

    @Transactional
    public ResponseEntity<String> createUser(UserDTO userDTO) {
        String email = userDTO.getEmail();

        if (!userHelper.isValidEmail(email)) {
            logger.error("Invalid email format: {}", email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid email format");
        }

        if (userHelper.isEmailAlreadyRegistered(email)) {
            logger.error("Email already registered: {}", email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email already registered");
        }

        if (!userHelper.doPasswordsMatch(userDTO.getPassword(), userDTO.getReEnterPassword())) {
            logger.error("Passwords do not match for email: {}", email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Passwords do not match");
        }

        // Get Current Logged in User's Company
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Company company = userInfo.getCompany();

        // Build User with company attached
        User user = userHelper.buildUserFromDTO(userDTO, "User", company);
        userRepository.save(user);
        logger.info("User saved with email: {}", email);

        EmailVerificationToken token = userHelper.createAndSaveEmailVerificationToken(user, 1);
        userHelper.sendVerificationEmail(email, token.getToken(), 1);

        return ResponseEntity.ok("User created, verification email sent");
    }


    public void updateUser(Long userId, UserDTO userDTO) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        user.setOwnerName(userDTO.getOwnerName());
//        user.setEmail(userDTO.getEmail());
        user.setUserPhone(userDTO.getCompanyPhone());
        user.setUserMobile(userDTO.getCompanyMobile());
        user.setActive(userDTO.getIsActive());
        userRepository.save(user);
    }

    public void softDeleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        user.setDeleteFlag(true);
        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional
    public List<User> getAllUsers() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return userRepository.findAllByCompanyIdAndDeleteFlagFalse(companyId);
    }

    public User getUserById(Long id) {
        return userRepository.findByIdAndDeleteFlagFalse(id)
                .orElse(null); // Returns null if not found
    }

    public User getUserByIdIfActive(Long userId) {
        return userRepository.findByIdAndDeleteFlagFalse(userId)
                .orElseThrow(() -> new RuntimeException("Active user not found with id: " + userId));
    }

    public ResponseEntity<String> changeUserPassword(ChangePasswordDTO request) {
        Optional<User> optionalUser = userRepository.findByEmailAndDeleteFlagFalse(request.getEmail());

        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = optionalUser.get();

        // Step 1: Ensure user belongs to current logged-in company
        Company currentCompany = UserService.getCurrentUserInfo().getCompany();
        if (!user.getCompany().getId().equals(currentCompany.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Unauthorized: This user does not belong to your company");
        }

        // Step 2: Check old password
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Old password is incorrect");
        }

        // Step 3: Save password history
        PasswordHistory passwordHistory = PasswordHistory.builder()
                .user(user)
                .password(user.getPassword()) // previous hashed password
                .changeDate(LocalDateTime.now())
                .build();
        passwordHistoryRepository.save(passwordHistory);

        // Step 4: Update new password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Password updated successfully");
    }

    @Transactional
    public ResponseEntity<String> forgotPassword(ForgotPasswordDTO request) {
        String email = request.getEmail();

        if (userHelper.isRateLimited(email, resetRequestCache)) {
            int waitMinutes = userHelper.getRateLimitRemainingMinutes(email, resetRequestCache);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Please wait " + waitMinutes + " minutes before trying again");
        }

        Optional<User> optionalUser = userHelper.findActiveUserByEmail(email);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = optionalUser.get();
        PasswordResetToken token = userHelper.createAndSaveResetToken(user, 1);
        userHelper.sendPasswordResetEmail(email, token.getToken(), 1);

        resetRequestCache.put(email, System.currentTimeMillis());

        return ResponseEntity.ok("Password reset link sent to your email");
    }

    public ResponseEntity<String> resetPassword(ResetPasswordDTO request) {
        if (!userHelper.doPasswordsMatchForResetPassword(request.getNewPassword(), request.getConfirmPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Passwords do not match");
        }

        Optional<PasswordResetToken> optionalToken = userHelper.findValidResetToken(request.getToken());
        if (optionalToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired token");
        }

        PasswordResetToken resetToken = optionalToken.get();
        User user = resetToken.getUser();

        userHelper.archiveCurrentPassword(user);
        userHelper.updateUserPassword(user, request.getNewPassword());
        userHelper.deleteResetToken(resetToken);

        return ResponseEntity.ok("Password reset successfully");
    }

    public static UserInfoResponse getCurrentUserInfo() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.carventory.entity.User user) {
            return UserInfoResponse.builder()
                    .id(user.getId())
                    .ownerName(user.getOwnerName())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .userPhone(user.getUserPhone())
                    .userMobile(user.getUserMobile())
                    .isActive(user.isActive())
                    .company(user.getCompany())
                    .build();
        }
        return null;
    }

    public boolean hasAnyUsers() {
        return userRepository.count() > 0;
    }
}