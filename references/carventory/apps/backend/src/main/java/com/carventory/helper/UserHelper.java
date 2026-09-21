package com.carventory.helper;

import com.carventory.dto.UserDTO;
import com.carventory.entity.*;
import com.carventory.repository.EmailVerificationTokenRepository;
import com.carventory.repository.PasswordHistoryRepository;
import com.carventory.repository.PasswordResetTokenRepository;
import com.carventory.repository.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserHelper {

    private static final Logger logger = LoggerFactory.getLogger(UserHelper.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final JavaMailSender mailSender;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordHistoryRepository passwordHistoryRepository;

    public Optional<String> validateUserInput(UserDTO userDTO) {
        String email = userDTO.getEmail();

        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            return Optional.of("Invalid email format");
        }

        if (userRepository.findByEmailAndDeleteFlagFalse(email).isPresent()) {
            return Optional.of("Email already registered");
        }

        if (!userDTO.getPassword().equals(userDTO.getReEnterPassword())) {
            return Optional.of("Passwords do not match");
        }

        return Optional.empty(); // No issues
    }

    public User createUserFromDTO(UserDTO dto, Company company) {
        return User.builder()
                .ownerName(dto.getOwnerName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role("Admin")
                .isActive(false)
                .userPhone(dto.getCompanyPhone())
                .userMobile(dto.getCompanyMobile())
                .company(company)
                .createdAt(LocalDateTime.now())
                .build();
    }

    public void sendVerificationToken(User user) {
        String token = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .build();
        emailVerificationTokenRepository.save(verificationToken);
        logger.info("Verification token saved: {}", token);

        String verificationUrl = "https://carventory-admin.netlify.app/verify-email?token=" + token;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(user.getEmail());
            helper.setSubject("Verify Your Email Address");

            String htmlContent = String.format(
                    "<html>\n" +
                            "<head>\n" +
                            "  <meta charset=\"UTF-8\">\n" +
                            "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                            "  <style>\n" +
                            "    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');\n" +
                            "    * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
                            "  </style>\n" +
                            "</head>\n" +
                            "<body style=\"background-color: #f4f6f8; font-family: 'Inter', sans-serif;\">\n" +
                            "  <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding: 40px 0;\">\n" +
                            "    <tr>\n" +
                            "      <td align=\"center\">\n" +
                            "        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); overflow: hidden;\">\n" +
                            "          <tr>\n" +
                            "            <td align=\"center\" style=\"background: linear-gradient(135deg, #3f51b5, #5c6bc0); padding: 40px 20px;\">\n" +
                            "              <h1 style=\"color: #ffffff; font-size: 26px; font-weight: 600; margin-bottom: 8px;\">Carventory</h1>\n" +
                            "              <p style=\"color: #e0e7ff; font-size: 15px;\">Verify your email to get started</p>\n" +
                            "            </td>\n" +
                            "          </tr>\n" +
                            "          <tr>\n" +
                            "            <td style=\"padding: 40px 30px;\">\n" +
                            "              <p style=\"font-size: 16px; color: #333; margin-bottom: 20px;\">Hello <strong>%s</strong>,</p>\n" +
                            "              <p style=\"font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 30px;\">\n" +
                            "                Thanks for signing up with <strong>Carventory</strong>! To complete your registration, click the button below to verify your email address.\n" +
                            "              </p>\n" +
                            "              <div style=\"text-align: center; margin-bottom: 40px;\">\n" +
                            "                <a href=\"%s\" style=\"background-color: #3f51b5; color: #fff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background 0.3s ease; display: inline-block;\">\n" +
                            "                  Verify Email\n" +
                            "                </a>\n" +
                            "              </div>\n" +
                            "              <p style=\"font-size: 13px; color: #777; margin-bottom: 8px;\">\n" +
                            "                This link will expire in 24 hours.\n" +
                            "              </p>\n" +
                            "              <p style=\"font-size: 13px; color: #777;\">\n" +
                            "                If you did not sign up for a Carventory account, please disregard this message.\n" +
                            "              </p>\n" +
                            "            </td>\n" +
                            "          </tr>\n" +
                            "          <tr>\n" +
                            "            <td style=\"background-color: #f7f9fb; text-align: center; padding: 20px 30px; font-size: 12px; color: #999;\">\n" +
                            "              &copy; 2025 Carventory. All rights reserved.<br/>\n" +
                            "              <a href=\"https://carventory-admin.netlify.app\" style=\"color: #3f51b5; text-decoration: none;\">Visit our website</a>\n" +
                            "            </td>\n" +
                            "          </tr>\n" +
                            "        </table>\n" +
                            "      </td>\n" +
                            "    </tr>\n" +
                            "  </table>\n" +
                            "</body>\n" +
                            "</html>", user.getOwnerName(), verificationUrl
            );



            helper.setText(htmlContent, true);
            mailSender.send(message);
            logger.info("HTML verification email sent to: {}", user.getEmail());

        } catch (MessagingException e) {
            logger.error("Failed to send verification email", e);
            // Optional: throw a custom exception here
        }
    }

    public Optional<EmailVerificationToken> validateAndGetToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            logger.error("Received null or empty token for verification");
            return Optional.empty();
        }

        logger.info("Processing verification for token: {}", token);
        Optional<EmailVerificationToken> optionalToken = emailVerificationTokenRepository.findByToken(token);

        if (optionalToken.isEmpty()) {
            logger.error("Invalid verification token: {}", token);
            return Optional.empty();
        }

        if (optionalToken.get().isExpired()) {
            emailVerificationTokenRepository.delete(optionalToken.get());
            logger.error("Verification token expired: {}", token);
            return Optional.empty();
        }

        return optionalToken;
    }

    public Optional<User> validateUserFromToken(EmailVerificationToken token) {
        String email = token.getUser().getEmail();
        Optional<User> optionalUser = userRepository.findByEmailAndDeleteFlagFalse(email);

        if (optionalUser.isEmpty()) {
            logger.error("User not found for token: {}", token.getToken());
            return Optional.empty();
        }

        return optionalUser;
    }

    public void activateUser(User user) {
        if (!user.isActive()) {
            user.setActive(true);
            userRepository.save(user);
            logger.info("User activated: {}", user.getEmail());
        } else {
            logger.info("User already activated: {}", user.getEmail());
        }
    }

    public void deleteTokenSafely(EmailVerificationToken token) {
        try {
            emailVerificationTokenRepository.delete(token);
            logger.info("Verification token deleted: {}", token.getToken());
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
            logger.warn("Token {} already deleted by another transaction", token.getToken());
        }
    }

    public boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }

    public boolean isEmailAlreadyRegistered(String email) {
        return userRepository.findByEmailAndDeleteFlagFalse(email).isPresent();
    }

    public boolean doPasswordsMatch(String password, String reEnterPassword) {
        return password != null && password.equals(reEnterPassword);
    }

    public User buildUserFromDTO(UserDTO dto, String role, Company company) {
        return User.builder()
                .ownerName(dto.getOwnerName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(role)
                .isActive(false)
                .userPhone(dto.getCompanyPhone())
                .userMobile(dto.getCompanyMobile())
                .company(company)
                .createdAt(LocalDateTime.now())
                .build();
    }

    public EmailVerificationToken createAndSaveEmailVerificationToken(User user, long hours) {
        String token = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(hours))
                .build();
        emailVerificationTokenRepository.save(verificationToken);
        logger.info("Verification token saved: {}", token);
        return verificationToken;
    }

    public void sendVerificationEmail(String email, String token, long expiryHours) {
        String verificationUrl = "https://carventory-admin.netlify.app/verify-email?token=" + token;
        String subject = "Verify Your Email - Carventory";

        String htmlContent = String.format(
                "<html>\n" +
                        "<head>\n" +
                        "  <meta charset=\"UTF-8\">\n" +
                        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                        "  <style>\n" +
                        "    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');\n" +
                        "    * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
                        "  </style>\n" +
                        "</head>\n" +
                        "<body style=\"background-color: #f4f6f8; font-family: 'Inter', sans-serif;\">\n" +
                        "  <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding: 40px 0;\">\n" +
                        "    <tr>\n" +
                        "      <td align=\"center\">\n" +
                        "        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); overflow: hidden;\">\n" +
                        "          <tr>\n" +
                        "            <td align=\"center\" style=\"background: linear-gradient(135deg, #3f51b5, #5c6bc0); padding: 40px 20px;\">\n" +
                        "              <h1 style=\"color: #ffffff; font-size: 26px; font-weight: 600; margin-bottom: 8px;\">Carventory</h1>\n" +
                        "              <p style=\"color: #e0e7ff; font-size: 15px;\">Verify your email to get started</p>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "          <tr>\n" +
                        "            <td style=\"padding: 40px 30px;\">\n" +
                        "              <p style=\"font-size: 16px; color: #333; margin-bottom: 20px;\">Hello,</p>\n" +
                        "              <p style=\"font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 30px;\">\n" +
                        "                Thanks for signing up with <strong>Carventory</strong>! To complete your registration, click the button below to verify your email address.\n" +
                        "              </p>\n" +
                        "              <div style=\"text-align: center; margin-bottom: 40px;\">\n" +
                        "                <a href=\"%s\" style=\"background-color: #3f51b5; color: #fff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background 0.3s ease; display: inline-block;\">\n" +
                        "                  Verify Email\n" +
                        "                </a>\n" +
                        "              </div>\n" +
                        "              <p style=\"font-size: 13px; color: #777; margin-bottom: 8px;\">\n" +
                        "                This link will expire in %d hour(s).\n" +
                        "              </p>\n" +
                        "              <p style=\"font-size: 13px; color: #777;\">\n" +
                        "                If you did not sign up for a Carventory account, please disregard this message.\n" +
                        "              </p>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "          <tr>\n" +
                        "            <td style=\"background-color: #f7f9fb; text-align: center; padding: 20px 30px; font-size: 12px; color: #999;\">\n" +
                        "              &copy; 2025 Carventory. All rights reserved.<br/>\n" +
                        "              <a href=\"https://carventory-admin.netlify.app\" style=\"color: #3f51b5; text-decoration: none;\">Visit our website</a>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "        </table>\n" +
                        "      </td>\n" +
                        "    </tr>\n" +
                        "  </table>\n" +
                        "</body>\n" +
                        "</html>", verificationUrl, expiryHours
        );

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, "UTF-8");

            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = isHtml
            mailSender.send(message);
            logger.info("Verification email sent to: {}", email);

        } catch (MessagingException e) {
            logger.error("Failed to send verification email to {}: {}", email, e.getMessage());
        }
    }

    public boolean isRateLimited(String email, Cache<String, Long> resetRequestCache) {
        Long lastRequestTime = resetRequestCache.getIfPresent(email);
        if (lastRequestTime == null) return false;

        long currentTime = System.currentTimeMillis();
        long timeSinceLastRequest = currentTime - lastRequestTime;
        return timeSinceLastRequest < 3600_000; // 1 hour
    }

    public int getRateLimitRemainingMinutes(String email, Cache<String, Long> resetRequestCache) {
        Long lastRequestTime = resetRequestCache.getIfPresent(email);
        if (lastRequestTime == null) return 0;
        long timeSinceLastRequest = System.currentTimeMillis() - lastRequestTime;
        return (int) ((3600 - timeSinceLastRequest / 1000) / 60);
    }

    public Optional<User> findActiveUserByEmail(String email) {
        return userRepository.findByEmailAndDeleteFlagFalse(email);
    }

    public PasswordResetToken createAndSaveResetToken(User user, long expiryHours) {
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(expiryHours))
                .build();
        passwordResetTokenRepository.save(resetToken);
        logger.info("Password reset token saved for user: {}", user.getEmail());
        return resetToken;
    }

    public void sendPasswordResetEmail(String email, String token, long expiryHours) {
        String resetUrl = "https://carventory-admin.netlify.app/reset-password?token=" + token;
        String subject = "Reset Your Password - Carventory";

        String htmlContent = String.format(
                "<html>\n" +
                        "<head>\n" +
                        "  <meta charset=\"UTF-8\">\n" +
                        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                        "  <style>\n" +
                        "    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');\n" +
                        "    * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
                        "  </style>\n" +
                        "</head>\n" +
                        "<body style=\"background-color: #f4f6f8; font-family: 'Inter', sans-serif;\">\n" +
                        "  <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding: 40px 0;\">\n" +
                        "    <tr>\n" +
                        "      <td align=\"center\">\n" +
                        "        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); overflow: hidden;\">\n" +
                        "          <tr>\n" +
                        "            <td align=\"center\" style=\"background: linear-gradient(135deg, #ff6f61, #ff9472); padding: 40px 20px;\">\n" +
                        "              <h1 style=\"color: #ffffff; font-size: 26px; font-weight: 600; margin-bottom: 8px;\">Carventory</h1>\n" +
                        "              <p style=\"color: #ffe3db; font-size: 15px;\">Password Reset Requested</p>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "          <tr>\n" +
                        "            <td style=\"padding: 40px 30px;\">\n" +
                        "              <p style=\"font-size: 16px; color: #333; margin-bottom: 20px;\">Hello,</p>\n" +
                        "              <p style=\"font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 30px;\">\n" +
                        "                We received a request to reset your <strong>Carventory</strong> account password. You can reset it by clicking the button below.\n" +
                        "              </p>\n" +
                        "              <div style=\"text-align: center; margin-bottom: 40px;\">\n" +
                        "                <a href=\"%s\" style=\"background-color: #ff6f61; color: #fff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;\">\n" +
                        "                  Reset Password\n" +
                        "                </a>\n" +
                        "              </div>\n" +
                        "              <p style=\"font-size: 13px; color: #777; margin-bottom: 8px;\">\n" +
                        "                This link is valid for %d hour(s).\n" +
                        "              </p>\n" +
                        "              <p style=\"font-size: 13px; color: #777;\">\n" +
                        "                If you didn’t request a password reset, you can safely ignore this email.\n" +
                        "              </p>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "          <tr>\n" +
                        "            <td style=\"background-color: #f7f9fb; text-align: center; padding: 20px 30px; font-size: 12px; color: #999;\">\n" +
                        "              &copy; 2025 Carventory. All rights reserved.<br/>\n" +
                        "              <a href=\"https://carventory-admin.netlify.app\" style=\"color: #ff6f61; text-decoration: none;\">Visit our website</a>\n" +
                        "            </td>\n" +
                        "          </tr>\n" +
                        "        </table>\n" +
                        "      </td>\n" +
                        "    </tr>\n" +
                        "  </table>\n" +
                        "</body>\n" +
                        "</html>", resetUrl, expiryHours
        );

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, "UTF-8");

            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // Send as HTML
            mailSender.send(message);
            logger.info("Password reset email sent to: {}", email);

        } catch (MessagingException e) {
            logger.error("Failed to send password reset email to {}: {}", email, e.getMessage());
        }
    }

    public boolean doPasswordsMatchForResetPassword(String password, String confirmPassword) {
        return password.equals(confirmPassword);
    }

    public Optional<PasswordResetToken> findValidResetToken(String token) {
        Optional<PasswordResetToken> optionalToken = passwordResetTokenRepository.findByToken(token);
        if (optionalToken.isEmpty()) return Optional.empty();

        PasswordResetToken resetToken = optionalToken.get();
        if (resetToken.isExpired()) {
            passwordResetTokenRepository.delete(resetToken);
            logger.warn("Expired reset token deleted: {}", token);
            return Optional.empty();
        }
        return Optional.of(resetToken);
    }

    public void archiveCurrentPassword(User user) {
        PasswordHistory passwordHistory = PasswordHistory.builder()
                .user(user)
                .password(user.getPassword())
                .changeDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        passwordHistoryRepository.save(passwordHistory);
        logger.info("Password history saved for user: {}", user.getEmail());
    }

    public void updateUserPassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logger.info("Password updated for user: {}", user.getEmail());
    }

    public void deleteResetToken(PasswordResetToken token) {
        passwordResetTokenRepository.delete(token);
        logger.info("Password reset token deleted for user: {}", token.getUser().getEmail());
    }
}
