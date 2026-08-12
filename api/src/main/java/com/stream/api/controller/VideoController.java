package com.stream.api.controller;

import com.stream.api.entity.VideoMetadata;
import com.stream.api.service.VideoService;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/videos")
@CrossOrigin(origins = "*")
public class VideoController {

    private final VideoService videoService;

    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description) {
        try {
            VideoMetadata metadata = videoService.saveVideo(file, title, description);
            return ResponseEntity.ok(Map.of(
                    "message", "Video uploaded successfully",
                    "videoKey", metadata.getVideoKey(),
                    "title", metadata.getTitle() != null ? metadata.getTitle() : "",
                    "description", metadata.getDescription() != null ? metadata.getDescription() : ""
            ));
        } catch (IOException | NoSuchAlgorithmException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/stream/{key}")
    public ResponseEntity<ResourceRegion> streamVideo(
            @PathVariable("key") String key,
            @RequestHeader(value = "Range", required = false) String rangeHeader) throws IOException {

        VideoMetadata metadata = videoService.getVideoMetadata(key);
        ResourceRegion region = videoService.getVideoRegion(metadata, rangeHeader);

        // Serve high-performance chunked file range response (HTTP 206 Partial Content)
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(region);
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Map<String, Object>> deleteVideo(@PathVariable("key") String key) {
        videoService.deleteVideo(key);
        return ResponseEntity.ok(Map.of(
                "message", "Video deleted successfully",
                "videoKey", key
        ));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Map<String, Object>>> listVideos() {
        // Obfuscate list views to secure filename and location
        List<Map<String, Object>> obfuscatedList = videoService.getAllVideos().stream()
                .map(video -> Map.<String, Object>of(
                        "videoKey", video.getVideoKey(),
                        "title", video.getTitle() != null ? video.getTitle() : "",
                        "description", video.getDescription() != null ? video.getDescription() : ""
                ))
                .toList();
        return ResponseEntity.ok(obfuscatedList);
    }
}
