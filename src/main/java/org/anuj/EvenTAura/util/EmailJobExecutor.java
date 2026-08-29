package org.anuj.EvenTAura.util;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.anuj.EvenTAura.model.EmailJob;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.model.enums.JobStatus;
import org.anuj.EvenTAura.repository.EmailJobRepository;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailJobExecutor {

    private final EmailJobRepository emailJobRepository;
    private final TicketRepository ticketRepository;
    private final JavaMailSender mailSender;

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMMM yyyy");

    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("hh:mm a");

    @Value("${app.mail.from}")
    private String from;

    /**
     * Checks for pending email jobs every second.
     */
    @Scheduled(fixedDelay = 60000)
    public void executeJobs() {

        List<EmailJob> jobs =
                emailJobRepository.findByStatusAndScheduledAtLessThanEqual(
                        JobStatus.PENDING,
                        LocalDateTime.now()
                );

        for (EmailJob job : jobs) {
            processJob(job);
        }
    }

    private void processJob(EmailJob job) {

        try {

            // Mark job as processing
            job.setStatus(JobStatus.PROCESSING);
            job.setProcessingStartedAt(LocalDateTime.now());
            emailJobRepository.save(job);

            // Get ticket
            Ticket ticket = ticketRepository.findById(job.getTicketId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Ticket not found: " + job.getTicketId()
                            ));

            // Send confirmation email
            sendTicketConfirmationEmail(ticket);

            // Mark successful
            job.setStatus(JobStatus.COMPLETED);
            job.setLastError(null);

            emailJobRepository.save(job);

            log.info(
                    "Ticket confirmation email sent successfully. " +
                            "Ticket ID: {}, Ticket Code: {}",
                    ticket.getTicketId(),
                    ticket.getTicketCode()
            );

        } catch (Exception e) {

            handleFailure(job, e);
        }
    }

    private void sendTicketConfirmationEmail(Ticket ticket)
            throws MessagingException {

        Event event = ticket.getEvent();

        String recipient = ticket.getUser().getEmail();

        MimeMessage message = mailSender.createMimeMessage();

        MimeMessageHelper helper =
                new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(recipient);
        helper.setFrom(from);
        helper.setSubject(
                "Ticket Confirmed - " + event.getTitle()
        );

        helper.setText(
                buildTicketConfirmationEmail(ticket, event),
                true
        );

        mailSender.send(message);
    }

    private String buildTicketConfirmationEmail(
            Ticket ticket,
            Event event
    ) {

        String userName = escapeHtml(ticket.getUser().getName());
        String eventTitle = escapeHtml(event.getTitle());
        String ticketCode = escapeHtml(ticket.getTicketCode());
        String location = escapeHtml(event.getLocation());

        String eventDate = event.getEventDate() != null
                ? event.getEventDate().format(DATE_FORMAT)
                : "Not specified";

        String eventTime = event.getEventTime() != null
                ? event.getEventTime().format(TIME_FORMAT)
                : "Not specified";

        return """
        <!DOCTYPE html>
        <html>
        <body style="margin:0;
                     padding:0;
                     background-color:#f4f6f9;
                     font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
                     color:#111827;">

        <div style="padding:35px 15px;">

            <div style="max-width:600px;
                        margin:0 auto;
                        background:#ffffff;
                        border-radius:14px;
                        overflow:hidden;
                        box-shadow:0 4px 18px rgba(0,0,0,0.06);">

                <!-- Header -->
                <div style="padding:30px 30px 20px;
                            text-align:center;">

                    <div style="font-size:28px;
                                font-weight:700;
                                color:#4F46E5;">
                        CampusHive
                    </div>

                    <div style="margin-top:18px;
                                font-size:23px;
                                font-weight:600;
                                color:#111827;">
                        Ticket Booking Confirmed 🎫
                    </div>

                </div>

                <!-- Content -->
                <div style="padding:0 30px 30px;">

                    <p style="font-size:16px;
                              color:#374151;
                              line-height:1.6;">
                        Hi %s,
                    </p>

                    <p style="font-size:15px;
                              color:#4B5563;
                              line-height:1.7;">
                        Your ticket has been successfully booked.
                        Here are your event details:
                    </p>

                    <!-- Event Details -->
                    <div style="margin:25px 0;
                                padding:22px;
                                background:#F9FAFB;
                                border:1px solid #E5E7EB;
                                border-radius:10px;">

                        <div style="margin-bottom:14px;">
                            <span style="color:#6B7280;
                                         font-size:13px;">
                                EVENT
                            </span>
                            <br>
                            <strong style="font-size:16px;">
                                %s
                            </strong>
                        </div>

                        <div style="margin-bottom:14px;">
                            <span style="color:#6B7280;
                                         font-size:13px;">
                                DATE
                            </span>
                            <br>
                            <strong>
                                %s
                            </strong>
                        </div>

                        <div style="margin-bottom:14px;">
                            <span style="color:#6B7280;
                                         font-size:13px;">
                                TIME
                            </span>
                            <br>
                            <strong>
                                %s
                            </strong>
                        </div>

                        <div>
                            <span style="color:#6B7280;
                                         font-size:13px;">
                                VENUE
                            </span>
                            <br>
                            <strong>
                                %s
                            </strong>
                        </div>

                    </div>

                    <!-- Ticket Code -->
                    <div style="text-align:center;
                                margin:30px 0;">

                        <p style="margin-bottom:10px;
                                  font-size:13px;
                                  color:#6B7280;
                                  text-transform:uppercase;
                                  letter-spacing:1px;">
                            Your Ticket Code
                        </p>

                        <div style="display:inline-block;
                                    padding:16px 28px;
                                    background:#EEF2FF;
                                    border:1px solid #C7D2FE;
                                    border-radius:10px;
                                    color:#4F46E5;
                                    font-size:25px;
                                    font-weight:700;
                                    letter-spacing:3px;">
                            %s
                        </div>

                    </div>

                    <p style="font-size:14px;
                              color:#6B7280;
                              line-height:1.6;
                              text-align:center;">
                        Please keep this email for your records.
                        Your ticket code may be required at the venue
                        for verification.
                    </p>

                    <hr style="border:0;
                               border-top:1px solid #E5E7EB;
                               margin:30px 0;">

                    <p style="margin:0;
                              font-size:12px;
                              color:#9CA3AF;
                              text-align:center;
                              line-height:1.5;">
                        This is an automated email from CampusHive.
                        Please do not reply to this email.
                    </p>

                </div>

            </div>

        </div>

        </body>
        </html>
        """.formatted(
                userName,
                eventTitle,
                eventDate,
                eventTime,
                location,
                ticketCode
        );
    }

    private void handleFailure(
            EmailJob job,
            Exception exception
    ) {

        int retryCount = job.getRetryCount() + 1;

        job.setRetryCount(retryCount);
        job.setLastError(
                exception.getMessage() != null
                        ? exception.getMessage()
                        : exception.getClass().getSimpleName()
        );

        if (retryCount >= job.getMaxRetries()) {

            job.setStatus(JobStatus.FAILED);

            log.error(
                    "Email job permanently failed. Job ID: {}, Ticket ID: {}",
                    job.getId(),
                    job.getTicketId(),
                    exception
            );

        } else {

            job.setStatus(JobStatus.PENDING);

            // Retry after 30 seconds
            job.setScheduledAt(
                    LocalDateTime.now().plusSeconds(30)
            );

            log.warn(
                    "Email job failed. Retrying {}/{}. " +
                            "Job ID: {}, Ticket ID: {}",
                    retryCount,
                    job.getMaxRetries(),
                    job.getId(),
                    job.getTicketId(),
                    exception
            );
        }

        emailJobRepository.save(job);
    }

    private String escapeHtml(String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
