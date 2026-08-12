package com.stream.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "video_metadata", indexes = {
    @Index(name = "idx_video_key", columnList = "videoKey", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String videoKey; 
    @Column(nullable = false)
    private String originalFileName; 
    @Column(nullable = false)
    private String contentType; 
    @Column(nullable = false)
    private Long fileSize; 

    @Column(nullable = false)
    private String storagePath;

    @Column
    private String title;

    @Column(length = 1000)
    private String description;
}
