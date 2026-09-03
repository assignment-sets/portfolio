import { portfolioData } from "@/data/portfolio";
import ContactForm from "./ContactForm";

export default function Contact() {
  return (
    <section id="contact">
      <h2>Contact</h2>
      <div className="contact-wrap">
        <div className="contact-info">
          <h3>Get in touch</h3>
          <p>
            If you want to work together or just say hi, shoot me an email or use
            the form.
          </p>
          <p>
            <a href={`mailto:${portfolioData.email}`}>{portfolioData.email}</a>
          </p>
          <p>{portfolioData.location}</p>
          <p style={{ marginTop: "16px" }}>
            <a
              href={portfolioData.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            &nbsp;&middot;&nbsp;
            <a
              href={portfolioData.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </p>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
