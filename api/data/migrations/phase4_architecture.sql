-- Phase 4 architecture enhancement migration
-- Adds brand knowledge graph storage for runtime grounding and feedback learning.

CREATE TABLE IF NOT EXISTS brand_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  relation TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  source TEXT DEFAULT 'brand_guide',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_knowledge_session
  ON brand_knowledge(session_id);

CREATE INDEX IF NOT EXISTS idx_brand_knowledge_entity_relation
  ON brand_knowledge(entity, relation);

CREATE INDEX IF NOT EXISTS idx_brand_knowledge_session_relation_created
  ON brand_knowledge(session_id, relation, created_at DESC);
