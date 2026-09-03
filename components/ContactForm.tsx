"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "ok" | "err" | "";
  }>({
    message: "",
    type: "",
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get("name") as string) || "";
    const email = (formData.get("email") as string) || "";
    const subject = (formData.get("subject") as string) || "";
    const message = (formData.get("message") as string) || "";

    setIsSubmitting(true);
    setStatus({ message: "", type: "" });

    try {
      const res = await fetch(
        "https://portfolio-nodemailer-api.vercel.app/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        }
      );

      if (res.ok) {
        setStatus({
          message: "Sent. I'll get back to you.",
          type: "ok",
        });
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({
          message:
            data.error || "Something went wrong. Email me directly.",
          type: "err",
        });
      }
    } catch {
      setStatus({
        message: "Failed to send. Email me directly.",
        type: "err",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          placeholder="What's up"
        />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          required
          placeholder="..."
        ></textarea>
      </div>
      <div className="submit-row">
        <button type="submit" id="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send"}
        </button>
        {status.message && (
          <span id="form-status" className={status.type}>
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
