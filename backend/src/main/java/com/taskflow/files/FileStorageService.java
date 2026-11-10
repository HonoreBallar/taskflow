package com.taskflow.files;

import com.taskflow.common.ApiException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    /** Extensions autorisées et type MIME associé (le type envoyé par le navigateur n'est pas fiable). */
    public static final Map<String, String> ALLOWED = Map.of(
            "pdf", "application/pdf",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    public static final Set<String> IMAGE_EXT = Set.of("jpg", "jpeg", "png");

    private static final byte[] PDF = "%PDF-".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] ZIP = {'P', 'K', 0x03, 0x04}; // docx et xlsx sont des archives ZIP

    private static final int MAX_NAME_LENGTH = 200;

    private final Path root;

    public FileStorageService(@Value("${taskflow.upload-dir}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() throws IOException {
        Files.createDirectories(root);
    }

    public record StoredFile(String storedName, String contentType, long size, String originalName) {
    }

    public StoredFile store(MultipartFile file, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Fichier vide");
        String original = sanitizeName(file.getOriginalFilename());
        String ext = extension(original);
        if (!allowedExtensions.contains(ext)) {
            throw ApiException.badRequest("Format non autorisé. Formats acceptés : " + String.join(", ", allowedExtensions));
        }
        String storedName = UUID.randomUUID() + "." + ext;
        try {
            // L'extension seule ne prouve rien : le contenu doit réellement être du type annoncé.
            try (InputStream in = file.getInputStream()) {
                if (!matchesSignature(ext, in.readNBytes(1024))) {
                    throw ApiException.badRequest("Le contenu du fichier ne correspond pas à son extension ." + ext);
                }
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, root.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'enregistrer le fichier", e);
        }
        return new StoredFile(storedName, ALLOWED.get(ext), file.getSize(), original);
    }

    public Resource load(String storedName) {
        try {
            Path path = root.resolve(storedName).normalize();
            if (!path.startsWith(root)) throw ApiException.notFound("Fichier");
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) throw ApiException.notFound("Fichier");
            return resource;
        } catch (MalformedURLException e) {
            throw ApiException.notFound("Fichier");
        }
    }

    public void delete(String storedName) {
        if (storedName == null) return;
        try {
            Path path = root.resolve(storedName).normalize();
            if (path.startsWith(root) && !path.equals(root)) Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // fichier déjà absent : rien à faire
        }
    }

    /** Supprime le fichier une fois la transaction validée (rien n'est perdu en cas de rollback). */
    public void deleteAfterCommit(String storedName) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            delete(storedName);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                delete(storedName);
            }
        });
    }

    public static String extension(String filename) {
        int i = filename.lastIndexOf('.');
        return i < 0 ? "" : filename.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    /** Ne garde que le nom (sans chemin ni caractère de contrôle), borné pour tenir en base. */
    static String sanitizeName(String raw) {
        if (raw == null) return "fichier";
        String name = raw.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("\\p{Cntrl}", "").trim();
        if (name.length() > MAX_NAME_LENGTH) {
            String ext = extension(name);
            name = name.substring(0, MAX_NAME_LENGTH - ext.length() - 1) + "." + ext;
        }
        return name.isBlank() ? "fichier" : name;
    }

    private static boolean matchesSignature(String ext, byte[] head) {
        return switch (ext) {
            case "pdf" -> indexOf(head, PDF) >= 0; // la norme tolère quelques octets avant l'en-tête
            case "jpg", "jpeg" -> startsWith(head, JPEG);
            case "png" -> startsWith(head, PNG);
            case "docx", "xlsx" -> startsWith(head, ZIP);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        return data.length >= prefix.length && Arrays.equals(data, 0, prefix.length, prefix, 0, prefix.length);
    }

    private static int indexOf(byte[] data, byte[] pattern) {
        for (int i = 0; i <= data.length - pattern.length; i++) {
            if (Arrays.equals(data, i, i + pattern.length, pattern, 0, pattern.length)) return i;
        }
        return -1;
    }
}
