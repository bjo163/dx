export function validateProjectPayload(body) {
  const source = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const slug = typeof source.slug === "string" ? source.slug.trim().toLowerCase() : "";
  const repositoryUrl = typeof source.repositoryUrl === "string" && source.repositoryUrl.trim()
    ? source.repositoryUrl.trim()
    : null;
  const defaultBranch = typeof source.defaultBranch === "string" && source.defaultBranch.trim()
    ? source.defaultBranch.trim()
    : "main";

  if (!name || name.length > 80) return { error: "Project name must contain 1 to 80 characters." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return { error: "Project slug must use lowercase letters, numbers and single hyphens." };
  }
  if (defaultBranch.length > 120 || /[\u0000-\u001f]/.test(defaultBranch)) {
    return { error: "Default branch is invalid." };
  }
  if (repositoryUrl) {
    try {
      const url = new URL(repositoryUrl);
      const segments = url.pathname.split("/").filter(Boolean);
      if (url.protocol !== "https:" || !["github.com", "gitlab.com"].includes(url.hostname) ||
          segments.length !== 2 || !/^[\w.-]+$/.test(segments[0]) ||
          !/^[\w.-]+(?:\.git)?$/.test(segments[1]) || url.search || url.hash) {
        return { error: "Repository URL must be a GitHub or GitLab HTTPS repository URL." };
      }
    } catch {
      return { error: "Repository URL must be a valid HTTPS repository URL." };
    }
  }

  return { value: { name, slug, repositoryUrl, defaultBranch } };
}
