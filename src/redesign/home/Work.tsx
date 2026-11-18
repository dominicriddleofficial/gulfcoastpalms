import { Link } from "react-router-dom";
import ProjectViewer from "../components/ProjectViewer";
import { featuredProjects, projects } from "../data/projects";

/** Selected completed projects, each with its job notes and the quote button for that kind of work. */
export default function Work() {
  return (
    <section className="rd-work rd-section rd-coal" aria-labelledby="rd-work-title">
      <div className="rd-wrap">
        <div className="rd-work__intro rd-rise" data-rv="">
          <h2 id="rd-work-title" className="rd-h2">Completed projects</h2>
          <Link to="/jobs" className="rd-link">See all {projects.length} projects</Link>
        </div>
        <ProjectViewer projects={featuredProjects} placement="home_projects" />
      </div>
    </section>
  );
}
