import ProjectWorkspace from "./ProjectWorkspace";

async function getApiData(path) {
  const base = process.env.API_INTERNAL_URL || "http://localhost:4000";
  try {
    const response = await fetch(new URL(path, base), { cache: "no-store" });
    if (!response.ok) return { error: "Control API is not ready." };
    return await response.json();
  } catch { return { error: "Control API is offline. Start the DX services and reload." }; }
}

export default async function Home() {
  const [health, projectResult] = await Promise.all([getApiData("/health"), getApiData("/api/projects")]);
  const apiStatus = health.status === "ok" ? "ONLINE" : "OFFLINE";
  const projects = projectResult.data || [];
  return <main className="shell">
    <aside className="rail"><div className="brand-mark">D<span>X</span></div><div className="rail-label">CONTROL<br/>PLANE</div><nav aria-label="Main navigation"><a className="nav-item active" href="#overview">◈ <span>Overview</span></a><a className="nav-item" href="#projects">▦ <span>Projects</span></a><a className="nav-item" href="#deployments">↗ <span>Deployments</span></a><a className="nav-item" href="#settings">⌘ <span>Settings</span></a></nav><div className="rail-bottom">DX / 0.2.0</div></aside>
    <section className="main" id="overview"><header className="topbar"><div><span className="eyebrow">DEVELOPER EXPERIENCE / SELF-HOSTED</span><h1>Ship without the noise.</h1></div><div className="system"><i className={apiStatus === "ONLINE" ? "" : "offline"}/> SYSTEM {apiStatus}</div></header>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">YOUR INFRASTRUCTURE. YOUR RULES.</span><h2>BUILD.<br/><em>DEPLOY.</em><br/>REPEAT.</h2><p>One cockpit for the things you ship. Connect a repository, define an environment, and make every release visible.</p><a className="cta" href="#projects">EXPLORE WORKSPACE <b>↗</b></a></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core">DX<span>///</span></div><div className="art-tag tag-top">CONTROL / 001</div><div className="art-tag tag-bottom">AUTOMATION IN MOTION</div><div className="crosshair">+</div></div><div className="hero-index">01 — 04</div></section>
    <section className="metrics"><article className="metric"><span>REGISTERED PROJECTS</span><strong>{projects.length.toString().padStart(2,"0")}</strong><small>Persisted in PostgreSQL</small></article><article className="metric"><span>ACTIVE BUILDS</span><strong>—</strong><small>Build worker not configured</small></article><article className="metric"><span>DEPLOYMENTS</span><strong>—</strong><small>Runtime adapter pending</small></article><article className="metric"><span>CONTROL API</span><strong className="status-word">{apiStatus}</strong><small>Fastify · PostgreSQL</small></article></section>
    <ProjectWorkspace initialProjects={projects} initialError={projectResult.error}/>
    <section className="next-step" id="deployments"><div className="next-icon">↗</div><div><span className="eyebrow">NEXT OPERATION</span><h3>Connect Git provider</h3><p>Project registry is online. GitHub App integration, deployment queue and isolated workers are the next implementation layer.</p></div><span className="phase">PHASE 02 / INTEGRATION</span></section><footer><span>DX PLATFORM — ENGINEERED FOR OWNERSHIP</span><span>NODE.JS / FASTIFY / NEXT.JS</span></footer></section></main>;
}
