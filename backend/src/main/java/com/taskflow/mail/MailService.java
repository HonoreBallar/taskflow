package com.taskflow.mail;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envoi des emails contenant un lien à usage unique (confirmation d'adresse, réinitialisation de mot de passe).
 * - SMTP_HOST défini : l'email est réellement envoyé ;
 * - LOG_RESET_LINKS=true (développement uniquement) : le lien est écrit dans les logs ;
 * - sinon : rien ne part, et un avertissement le signale au démarrage.
 * Un échec d'envoi n'est jamais remonté à l'appelant : la réponse HTTP ne doit pas révéler si un compte existe.
 */
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String smtpHost;
    private final String from;
    private final boolean logLinks;

    public MailService(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${spring.mail.host:}") String smtpHost,
                       @Value("${taskflow.mail.from}") String from,
                       @Value("${taskflow.log-reset-links:false}") boolean logLinks) {
        this.mailSender = mailSender;
        this.smtpHost = smtpHost;
        this.from = from;
        this.logLinks = logLinks;
    }

    private boolean smtpConfigured() {
        return smtpHost != null && !smtpHost.isBlank();
    }

    @PostConstruct
    void warnIfNoDelivery() {
        if (!smtpConfigured() && !logLinks) {
            log.warn("Aucun envoi d'email configuré (SMTP_HOST vide) : les liens de confirmation et de "
                    + "réinitialisation ne seront pas délivrés.");
        }
        if (logLinks) {
            log.warn("LOG_RESET_LINKS=true : les liens de confirmation et de réinitialisation sont écrits dans "
                    + "les logs. À désactiver en production.");
        }
    }

    public void sendLink(String to, String subject, String intro, String link) {
        if (logLinks) log.info("[email] {} — pour {} : {}", subject, to, link);
        if (!smtpConfigured()) return;

        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(intro + "\n\n" + link + "\n\n"
                + "Ce lien est personnel et à usage unique. Si vous n'êtes pas à l'origine de cette demande, "
                + "ignorez simplement cet email.\n\nTaskFlow");
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Échec de l'envoi de l'email « {} » : {}", subject, e.getMessage());
        }
    }
}
