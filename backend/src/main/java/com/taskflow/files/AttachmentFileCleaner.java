package com.taskflow.files;

import jakarta.persistence.PostRemove;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Supprime le fichier du disque dès que la pièce jointe est supprimée en base, y compris en cascade
 * (suppression d'une tâche, d'un projet ou d'un workspace). Sans cela, les fichiers « supprimés »
 * resteraient indéfiniment sur le serveur.
 */
@Component
@RequiredArgsConstructor
public class AttachmentFileCleaner {

    private final FileStorageService storage;

    @PostRemove
    void onRemove(Attachment attachment) {
        storage.deleteAfterCommit(attachment.getStoredName());
    }
}
