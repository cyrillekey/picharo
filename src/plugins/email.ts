import fp from "fastify-plugin";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config.js";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  readonly provider: "smtp" | "brevo";
  send(message: EmailMessage): Promise<void>;
}

export interface EmailPluginOptions {
  // Override the configured provider. Primarily useful in tests.
  provider?: "smtp" | "brevo";
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export default fp<EmailPluginOptions>(async (fastify, opts) => {
  const provider = opts.provider ?? (config.email.useBrevo ? "brevo" : "smtp");

  let transporter: Transporter | null = null;

  if (provider === "smtp") {
    if (config.email.smtp.host) {
      transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: config.email.smtp.user
          ? {
              user: config.email.smtp.user,
              pass: config.email.smtp.pass,
            }
          : undefined,
      });
    } else {
      fastify.log.warn(
        "SMTP_HOST is not set. Outgoing email will fail until SMTP is configured.",
      );
    }
  } else if (!config.email.brevoApiKey) {
    fastify.log.warn(
      "BREVO_API_KEY is not set. Outgoing email will fail until Brevo is configured.",
    );
  }

  const sendWithSmtp = async (message: EmailMessage): Promise<void> => {
    if (!transporter) {
      throw new Error(
        "SMTP is not configured. Set SMTP_HOST and the related SMTP environment variables.",
      );
    }

    await transporter.sendMail({
      from: {
        name: config.email.fromName,
        address: config.email.fromEmail,
      },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  };

  const sendWithBrevo = async (message: EmailMessage): Promise<void> => {
    if (!config.email.brevoApiKey) {
      throw new Error("Brevo is not configured. Set BREVO_API_KEY.");
    }

    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.email.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: config.email.fromEmail,
          name: config.email.fromName,
        },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Brevo API request failed with status ${response.status}: ${body}`,
      );
    }
  };

  fastify.decorate("email", {
    provider,
    send: provider === "brevo" ? sendWithBrevo : sendWithSmtp,
  } satisfies EmailService);
});

declare module "fastify" {
  interface FastifyInstance {
    email: EmailService;
  }
}
