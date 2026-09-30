package com.dealerops.core.dealer;

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
 * Set {@code ADMIN_USERNAME} / {@code ADMIN_PASSWORD}; never commit real values to the repo.
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
    if (username == null || username.isBlank() || password == null || password.isBlank()) {
      log.info("ADMIN_USERNAME/ADMIN_PASSWORD not set; skipping platform admin seed.");
      return;
    }
    username = username.trim();
    if (appUserRepository
        .findByEntraTenantIdAndEntraOid(AppUserEntity.LOCAL_TENANT_ID, username)
        .isPresent()) {
      return;
    }
    AppUserEntity admin = new AppUserEntity();
    admin.setEntraTenantId(AppUserEntity.LOCAL_TENANT_ID);
    admin.setEntraOid(username);
    admin.setPasswordHash(passwordEncoder.encode(password));
    admin.setDisplayName("Platform Admin");
    admin.setRole(AppRole.PLATFORM_ADMIN);
    admin.setDealerId(null);
    admin.setActive(true);
    appUserRepository.save(admin);
    log.info("Seeded platform admin account '{}'.", username);
  }
}
