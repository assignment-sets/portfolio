import { portfolioData } from "@/data/portfolio";

export default function Skills() {
  return (
    <section id="skills">
      <h2>Skills</h2>
      <div className="skills-block">
        {portfolioData.skills.map((skill) => (
          <div className="skill-row" key={skill.label}>
            <span className="skill-label">{skill.label}</span>
            <span className="skill-value">{skill.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
