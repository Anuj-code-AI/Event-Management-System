package org.anuj.EvenTAura.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class FileStorageService {

    private final String UPLOAD_DIR = "uploads/images/";

    public String saveImage(MultipartFile file, String imageCategory) {

        try {

            String original = StringUtils.cleanPath(file.getOriginalFilename());
            String fileName = System.currentTimeMillis() + "_" + original;

            Path uploadPath = Paths.get(UPLOAD_DIR + imageCategory);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/images/" + imageCategory + "/" + fileName;

        } catch (Exception e) {
            throw new RuntimeException("Could not store file");
        }
    }
}
