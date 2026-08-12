package com.stream.api.repository;

import com.stream.api.entity.VideoMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<VideoMetadata, Long> {
    Optional<VideoMetadata> findByVideoKey(String videoKey);
}
