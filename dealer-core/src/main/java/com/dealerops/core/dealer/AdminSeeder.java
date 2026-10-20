package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the single platform admin account on first startup (client spec S2: "a single platform
 * admin provisions each dealer business and issues login credentials" — nobody else can create
 * the first account, so it comes from env vars, not the UI). No-op once that username exists.
 * Set {@code ADMIN_USERNAME} / {@code ADMIN_PASSWORD} (sign-in by username), and optionally
 * {@code ADMIN_EMAIL} and/or {@code ADMIN_PHONE} as extra sign-in names; never commit real values.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

  private final AppUserRepository appUserRepository;
  private final PasswordEncoder passwordEncoder;
  private final Environment environment;

  public AdminSeeder(
      AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, Environment environment) {
    this.appUserRepository = appUserRepository;
    this.passwordEncoder = passwordEncoder;
    this.environment = environment;
  }

  @Override
  public void run(ApplicationArguments args) {
    String username = environment.getProperty("ADMIN_USERNAME");
    String password = environment.getProperty("ADMIN_PASSWORD");
    String email = environment.getProperty("ADMIN_EMAIL");
    String phone = environment.getProperty("ADMIN_PHONE");
    if (username == null || username.isBlank() || password == null || password.isBlank()) {
      log.info("ADMIN_USERNAME/ADMIN_PASSWORD not set; skipping platform admin seed.");
      return;
    }
    if (phone != null && !phone.isBlank()) {
      phone = LoginIdentifiers.phoneOrNull(phone);
      if (phone == null) {
        throw new IllegalStateException("ADMIN_PHONE must include a valid international country code.");
      }
    } else {
      phone = null;
    }
    try {
      email = email == null || email.isBlank() ? null : LoginIdentifiers.email(email);
    } catch (ApiException ex) {
      throw new IllegalStateException("ADMIN_EMAIL must be a valid email address.");
    }
    username = username.trim();
    AppUserEntity existing = appUserRepository.findByUsername(username).orElse(null);
    if (existing != null) {
      if ((existing.getEmail() == null || existing.getEmail().isBlank()) && email != null) {
        existing.setEmail(email);
        appUserRepository.save(existing);
      }
      if ((existing.getPhone() == null || existing.getPhone().isBlank()) && phone != null) {
        existing.setPhone(phone);
        appUserRepository.save(existing);
      }
      return;
    }
    AppUserEntity admin = new AppUserEntity();
    admin.setUsername(username);
    admin.setPasswordHash(passwordEncoder.encode(password));
    admin.setDisplayName("Platform Admin");
    admin.setEmail(email);
    admin.setPhone(phone);
    admin.setRole(AppRole.PLATFORM_ADMIN);
    admin.setDealerId(null);
    admin.setActive(true);
    appUserRepository.save(admin);
    log.info("Seeded platform admin account '{}'.", username);
  }
}
