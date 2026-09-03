import { portfolioData } from "@/data/portfolio";

export default function Education() {
  return (
    <section id="education">
      <h2>Education</h2>
      <div className="edu-list">
        {portfolioData.education.map((item) => (
          <div className="edu-item" key={item.degree}>
            <span className="edu-year">{item.period}</span>
            <div className="edu-body">
              <h3>{item.degree}</h3>
              <p className="inst">{item.institution}</p>
              <p className="grade">{item.grade}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
