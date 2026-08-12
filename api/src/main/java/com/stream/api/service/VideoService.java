package com.stream.api.service;

import com.stream.api.entity.VideoMetadata;
import com.stream.api.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Optional;

@Service
public class VideoService {

    private final VideoRepository videoRepository;

    @Value("${app.upload.dir}")
    private String uploadDirStr;

    private Path uploadDir;

    public VideoService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    @PostConstruct
    public void init() {
        this.uploadDir = Paths.get(uploadDirStr).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload folder: " + uploadDirStr, e);
        }
    }

    private String getFfmpegCommand() {
        try {
            Process process = new ProcessBuilder("ffmpeg", "-version").start();
            process.destroy();
            return "ffmpeg";
        } catch (IOException e) {
            String localAppData = System.getenv("LOCALAPPDATA");
            if (localAppData != null) {
                File defaultWingetFfmpeg = new File(localAppData, 
                    "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe");
                if (defaultWingetFfmpeg.exists()) {
                    return defaultWingetFfmpeg.getAbsolutePath();
                }
            }
            return "ffmpeg";
        }
    }

    @Transactional
    public VideoMetadata saveVideo(MultipartFile file, String title, String description) throws IOException, NoSuchAlgorithmException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        Path tempRawFile = Files.createTempFile("raw_upload_", "_" + file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), tempRawFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            Path tempTranscodedFile = Files.createTempFile("transcoded_upload_", ".mp4");
            try {
                String ffmpegCmd = getFfmpegCommand();
                ProcessBuilder pb = new ProcessBuilder(
                        ffmpegCmd,
                        "-y",
                        "-i", tempRawFile.toAbsolutePath().toString(),
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "23",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        "-movflags", "+faststart",
                        tempTranscodedFile.toAbsolutePath().toString()
                );
                pb.inheritIO();
                Process process = pb.start();

                int exitCode = process.waitFor();
                if (exitCode != 0) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Video transcoding failed. Ensure the format is valid.");
                }
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream is = Files.newInputStream(tempTranscodedFile)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        digest.update(buffer, 0, bytesRead);
                    }
                }

                byte[] hash = digest.digest();
                StringBuilder hexString = new StringBuilder();
                for (byte b : hash) {
                    String hex = Integer.toHexString(0xff & b);
                    if (hex.length() == 1) {
                        hexString.append('0');
                    }
                    hexString.append(hex);
                }
                String videoKey = hexString.toString();
                Optional<VideoMetadata> existingMetadata = videoRepository.findByVideoKey(videoKey);
                if (existingMetadata.isPresent()) {
                    Files.deleteIfExists(tempTranscodedFile);
                    return existingMetadata.get();
                }
                Path targetLocation = uploadDir.resolve(videoKey);
                Files.move(tempTranscodedFile, targetLocation, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                VideoMetadata metadata = VideoMetadata.builder()
                        .videoKey(videoKey)
                        .originalFileName(file.getOriginalFilename())
                        .contentType("video/mp4")
                        .fileSize(Files.size(targetLocation))
                        .storagePath(targetLocation.toString())
                        .title(title == null || title.isEmpty() ? file.getOriginalFilename() : title)
                        .description(description == null ? "" : description)
                        .build();

                return videoRepository.save(metadata);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                Files.deleteIfExists(tempTranscodedFile);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Transcoding interrupted: " + e.getMessage());
            } finally {
                Files.deleteIfExists(tempTranscodedFile);
            }
        } finally {
            Files.deleteIfExists(tempRawFile);
        }
    }

    public VideoMetadata getVideoMetadata(String videoKey) {
        return videoRepository.findByVideoKey(videoKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }

    public List<VideoMetadata> getAllVideos() {
        return videoRepository.findAll();
    }

    public ResourceRegion getVideoRegion(VideoMetadata metadata, String rangeHeader) throws IOException {
        File file = new File(metadata.getStoragePath());
        if (!file.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Physical file not found on disk");
        }

        Resource resource = new FileSystemResource(file);
        long contentLength = file.length();
        long chunkSizeBytes = 1024 * 1024; // 1MB chunk size limit per range request

        if (rangeHeader == null || rangeHeader.isEmpty()) {
            // Serve the first 1MB if no range is requested
            long rangeLength = Math.min(chunkSizeBytes, contentLength);
            return new ResourceRegion(resource, 0, rangeLength);
        }

        try {
            // Parse Range header (e.g. bytes=0- or bytes=1000-2000)
            String rangeValue = rangeHeader.replace("bytes=", "").trim();
            String[] parts = rangeValue.split("-");
            long start = Long.parseLong(parts[0]);

            long end;
            if (parts.length > 1 && !parts[1].isEmpty()) {
                end = Long.parseLong(parts[1]);
            } else {
                end = contentLength - 1;
            }

            if (start >= contentLength) {
                throw new ResponseStatusException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
                        "Range start " + start + " exceeds file content length " + contentLength);
            }

            if (end >= contentLength) {
                end = contentLength - 1;
            }

            // Cap the region length to chunkSizeBytes (1MB) to stream progressively
            long rangeLength = Math.min(chunkSizeBytes, (end - start) + 1);
            return new ResourceRegion(resource, start, rangeLength);
        } catch (NumberFormatException e) {
            long rangeLength = Math.min(chunkSizeBytes, contentLength);
            return new ResourceRegion(resource, 0, rangeLength);
        }
    }

    @Transactional
    public void deleteVideo(String videoKey) {
        VideoMetadata metadata = videoRepository.findByVideoKey(videoKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));

        // Delete physical file from disk
        Path filePath = Paths.get(metadata.getStoragePath());
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete file from disk: " + e.getMessage());
        }

        // Delete metadata record from MySQL
        videoRepository.delete(metadata);
    }
}
