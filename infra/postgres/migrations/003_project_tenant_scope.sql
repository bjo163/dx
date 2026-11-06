ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS projects_organization_created_idx
  ON projects (organization_id, created_at DESC);

-- Existing unowned projects are intentionally not assigned to an arbitrary tenant.
-- They remain inaccessible through organization-scoped API queries until an explicit,
-- audited ownership-transfer operation is implemented.
