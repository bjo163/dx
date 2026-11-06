ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS projects_organization_slug_unique
  ON projects (organization_id, slug)
  WHERE organization_id IS NOT NULL;

-- Unassigned legacy projects keep their historical rows but are excluded from
-- tenant-scoped queries until an audited ownership-transfer flow is implemented.
