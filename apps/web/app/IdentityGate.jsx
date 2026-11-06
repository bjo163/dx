"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const blank = { email: "", password: "", organizationName: "", organizationSlug: "", bootstrapToken: "" };

export default function IdentityGate({ mode, message = "" }) {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = mode === "setup";
  const unavailable = mode === "unavailable";

  function update(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
      ...(field === "organizationName" && !current.organizationSlug
        ? { organizationSlug: value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }
        : {})
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(setup ? "/api/setup/owner" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(setup ? form : { email: form.email, password: form.password, bootstrapToken: form.bootstrapToken })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Request failed.");
      router.refresh();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="identity-screen">
    <div className="identity-noise" aria-hidden="true"/>
    <section className="identity-panel">
      <div className="identity-brand">D<span>X</span><small>CONTROL PLANE / 001</small></div>
      <span className="eyebrow">{setup ? "FIRST BOOT / OWNER INITIALIZATION" : unavailable ? "CONTROL PLANE / CONNECTION LOST" : "AUTHENTICATED ACCESS REQUIRED"}</span>
      <h1>{setup ? <>CLAIM<br/><em>YOUR</em><br/>COCKPIT.</> : unavailable ? <>SYSTEM<br/><em>OFFLINE.</em></> : <>BACK TO<br/><em>BUILD.</> }</h1>
      <p>{setup
        ? "Initialize your private DX instance. The first account becomes the organization owner. This one-time operation requires the bootstrap secret configured on the server."
        : unavailable ? message || "The control API or database is unavailable. Check service health and database migrations, then reload."
        : "Sign in to access your organization, project registry and deployment control plane."}</p>
      {!unavailable && <form className="identity-form" onSubmit={submit}>
        {setup && <label>BOOTSTRAP SECRET<input required type="password" autoComplete="off" value={form.bootstrapToken} onChange={event => update("bootstrapToken", event.target.value)} placeholder="Secret from server .env"/></label>}
        <label>OWNER EMAIL<input required type="email" maxLength="254" autoComplete="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com"/></label>
        <label>PASSWORD<input required type="password" minLength="12" maxLength="128" autoComplete={setup ? "new-password" : "current-password"} value={form.password} onChange={event => update("password", event.target.value)} placeholder={setup ? "At least 12 characters" : "Your password"}/></label>
        {setup && <>
          <label>ORGANIZATION NAME<input required maxLength="100" value={form.organizationName} onChange={event => update("organizationName", event.target.value)} placeholder="My team / company"/></label>
          <label>ORGANIZATION SLUG<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength="80" value={form.organizationSlug} onChange={event => update("organizationSlug", event.target.value)} placeholder="my-organization"/></label>
        </>}
        {error && <div className="identity-error" role="alert">{error}</div>}
        <button className="identity-submit" disabled={busy}>{busy ? "PROCESSING…" : setup ? "INITIALIZE DX / CREATE OWNER ↗" : "SIGN IN ↗"}</button>
      </form>}
      <div className="identity-foot"><span>MOONWITNESS / ROCKSOUL DX</span><span>PRIVATE INSTANCE · SECURE BOOT</span></div>
    </section>
    <aside className="identity-art" aria-hidden="true"><div className="identity-orbit orbit-a"/><div className="identity-orbit orbit-b"/><div className="identity-core">DX<span>///</span></div><div className="identity-cross">✳</div><small>OWN YOUR STACK / OWN YOUR SIGNAL</small></aside>
  </main>;
}

export function AccountControl({ email, organization }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const csrf = document.cookie.split("; ").find(item => item.startsWith("dx_csrf="))?.split("=").slice(1).join("=") || "";
      await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": decodeURIComponent(csrf) }, body: "{}" });
      router.refresh();
    } finally { setBusy(false); }
  }
  return <div className="account-control"><span>{email}<small>{organization}</small></span><button onClick={logout} disabled={busy}>{busy ? "…" : "SIGN OUT ↗"}</button></div>;
}
