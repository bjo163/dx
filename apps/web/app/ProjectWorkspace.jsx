"use client";

import { useEffect, useMemo, useState } from "react";

const emptyForm = { name: "", slug: "", repositoryUrl: "", defaultBranch: "main" };

export default function ProjectWorkspace({ initialProjects, initialError }) {
  const [projects, setProjects] = useState(initialProjects);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const count = useMemo(() => projects.length.toString().padStart(2, "0"), [projects.length]);

  useEffect(() => {
    let active = true;
    fetch("/api/projects", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load projects.");
        if (active) { setProjects(body.data || []); setError(""); }
      })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value, ...(field === "name" && !current.slug ? { slug: value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) }));
  }

  async function createProject(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": decodeURIComponent(document.cookie.split("; ").find(item => item.startsWith("dx_csrf="))?.split("=").slice(1).join("=") || "")
        },
        body: JSON.stringify(form)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Project creation failed.");
      setProjects(current => [body.data, ...current]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="section-head" id="projects">
      <div><span className="eyebrow">WORKSPACE / PROJECT REGISTRY</span><h3>Projects <span className="project-count">{count}</span></h3></div>
      <button className="action-button" onClick={() => setShowForm(value => !value)}>{showForm ? "CLOSE ×" : "+ NEW PROJECT"}</button>
    </section>
    {showForm && <form className="project-form" onSubmit={createProject}>
      <div className="form-heading"><span className="eyebrow">NEW WORKSPACE OBJECT</span><strong>Register a project</strong></div>
      <div className="form-grid">
        <label>PROJECT NAME<input required maxLength="80" value={form.name} onChange={event => update("name", event.target.value)} placeholder="My application"/></label>
        <label>PROJECT SLUG<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={event => update("slug", event.target.value)} placeholder="my-application"/></label>
        <label className="wide">GIT REPOSITORY URL <span className="optional">OPTIONAL</span><input type="url" value={form.repositoryUrl} onChange={event => update("repositoryUrl", event.target.value)} placeholder="https://github.com/owner/repository"/></label>
        <label>DEFAULT BRANCH<input required value={form.defaultBranch} onChange={event => update("defaultBranch", event.target.value)} placeholder="main"/></label>
      </div>
      <div className="form-actions"><span>Repository credentials are not requested or stored in this step.</span><button className="action-button primary" disabled={busy}>{busy ? "REGISTERING…" : "REGISTER PROJECT ↗"}</button></div>
    </form>}
    {error && <div className="notice" role="alert"><strong>CONTROL API NOTICE</strong><span>{error}</span></div>}
    {projects.length === 0 ? <div className="empty-state"><div className="empty-mark">＋</div><span className="eyebrow">NO PROJECTS REGISTERED</span><h4>Your workspace is a blank canvas.</h4><p>Register a repository to establish its identity in the DX control plane. Builds and deployments will be connected in upcoming phases.</p><button className="action-button" onClick={() => setShowForm(true)}>CREATE FIRST PROJECT ↗</button></div> :
      <div className="project-list">{projects.map(project => <article className="project-row" key={project.id}><div className="project-symbol">DX<span>///</span></div><div className="project-info"><strong>{project.name}</strong><span>{project.repository_url || "Repository not connected"} · {project.default_branch}</span></div><code>{project.slug}</code><span className="project-state">REGISTERED</span></article>)}</div>}
  </>;
}
