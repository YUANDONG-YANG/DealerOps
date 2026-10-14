package com.dealerops.core.config;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LogFileInitializer {

  private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

  private final String logDirectory;
  private final String serviceName;

  public LogFileInitializer(
      @Value("${dealerops.log-dir:log-sum}") String logDirectory,
      @Value("${spring.application.name}") String serviceName) {
    this.logDirectory = logDirectory;
    this.serviceName = serviceName;
  }

  @PostConstruct
  void truncateCurrentLog() throws IOException {
    Path logFile =
        Path.of(logDirectory, serviceName + "-" + LocalDate.now().format(DATE) + ".log");
    Files.createDirectories(logFile.getParent());
    Files.newByteChannel(
            logFile,
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE,
            StandardOpenOption.TRUNCATE_EXISTING)
        .close();
  }
}
