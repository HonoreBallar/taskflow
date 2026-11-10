package com.taskflow.users;

import com.taskflow.common.ApiException;
import com.taskflow.files.FileStorageService;
import com.taskflow.security.CurrentUserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs / Profil")
public class UserController {

    private final UserService service;
    private final UserRepository repository;
    private final FileStorageService storage;
    private final CurrentUserService currentUser;

    @GetMapping("/me")
    public UserDto me() {
        return UserDto.from(currentUser.get());
    }

    @PutMapping("/me")
    public UserDto updateProfile(@Valid @RequestBody UserDtos.ProfileRequest req) {
        return service.updateProfile(currentUser.get(), req);
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody UserDtos.ChangePasswordRequest req) {
        service.changePassword(currentUser.get(), req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto uploadAvatar(@RequestParam("file") MultipartFile file) {
        return service.uploadAvatar(currentUser.get(), file);
    }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> avatar(@PathVariable Long id) {
        User u = service.getEntity(id);
        if (u.getAvatarPath() == null) throw ApiException.notFound("Avatar");
        String ext = FileStorageService.extension(u.getAvatarPath());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(FileStorageService.ALLOWED.get(ext)))
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .header("X-Content-Type-Options", "nosniff")
                .body(storage.load(u.getAvatarPath()));
    }

    /** Recherche d'utilisateurs (pour inviter / affecter). */
    @GetMapping
    public List<UserDto> search(@RequestParam(defaultValue = "") String q) {
        User me = currentUser.get();
        if (q.trim().length() < 2) return List.of();
        return repository.search(q.trim(), me.getId(), CurrentUserService.isAdmin(me)).stream()
                .limit(20).map(UserDto::from).toList();
    }
}
