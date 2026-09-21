package com.carventory.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
public class CloudinaryUploader {

    private final Cloudinary cloudinary;

    @Autowired
    public CloudinaryUploader(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            log.warn("No file provided for upload to Cloudinary.");
            return null;
        }
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "auto"
            ));
            String url = (String) uploadResult.get("secure_url");
            log.info("File uploaded to Cloudinary: {}", url);
            return url;
        } catch (IOException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage(), e);
            throw new RuntimeException("Cloudinary upload failed", e);
        }
    }

    /**
     * Deletes a file from Cloudinary given its public URL.
     * @param fileUrl the secure_url or url returned by Cloudinary
     * @return true if deleted successfully, false otherwise
     */
    public boolean deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            log.warn("No file URL provided for deletion from Cloudinary.");
            return false;
        }
        try {
            // Extract public_id from the URL
            // Example: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/filename.jpg
            // public_id = folder/filename (without extension)
            String[] parts = fileUrl.split("/upload/");
            if (parts.length < 2) {
                log.error("Invalid Cloudinary URL: {}", fileUrl);
                return false;
            }
            String publicIdWithVersion = parts[1];
            // Remove version if present (e.g., v1234567890/)
            publicIdWithVersion = publicIdWithVersion.replaceFirst("^v[0-9]+/", "");
            // Remove file extension
            int dotIndex = publicIdWithVersion.lastIndexOf('.');
            String publicId = (dotIndex > 0) ? publicIdWithVersion.substring(0, dotIndex) : publicIdWithVersion;
            Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Cloudinary delete result for {}: {}", publicId, result);
            return "ok".equals(result.get("result"));
        } catch (Exception e) {
            log.error("Cloudinary delete failed for {}: {}", fileUrl, e.getMessage(), e);
            return false;
        }
    }
} 