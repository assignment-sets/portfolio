export default function Experience() {
  return (
    <section id="experience">
      <h2>Experience</h2>
      <div className="exp-skeleton-wrap">
        <div className="exp-skeleton-card">
          <div>
            <div className="skel skel-line tiny"></div>
            <div
              className="skel skel-line tiny"
              style={{ width: "30%", marginTop: "4px" }}
            ></div>
          </div>
          <div>
            <div className="skel skel-line short"></div>
            <div className="skel skel-line medium"></div>
            <div className="skel skel-line long"></div>
            <div
              className="skel skel-line short"
              style={{ width: "45%" }}
            ></div>
          </div>
        </div>

        <div className="exp-skeleton-card">
          <div>
            <div className="skel skel-line tiny"></div>
            <div
              className="skel skel-line tiny"
              style={{ width: "28%", marginTop: "4px" }}
            ></div>
          </div>
          <div>
            <div
              className="skel skel-line medium"
              style={{ width: "50%" }}
            ></div>
            <div className="skel skel-line long"></div>
            <div className="skel skel-line medium"></div>
          </div>
        </div>
      </div>
      <p className="exp-note">still loading&hellip; (no eta)</p>
    </section>
  );
}
