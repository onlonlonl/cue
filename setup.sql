-- Cue · 线索 · Database Setup

CREATE TABLE cue_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text NOT NULL DEFAULT 'lux'
    CHECK (created_by IN ('iris', 'lux')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cue_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text NOT NULL CHECK (created_by IN ('iris', 'lux')),
  created_for text NOT NULL CHECK (created_for IN ('iris', 'lux')),
  title text NOT NULL,
  category text DEFAULT '',
  constellation_id uuid REFERENCES cue_constellations(id),
  concept text DEFAULT '',
  explanation text DEFAULT '',
  reading_list text DEFAULT '',
  iris_teaching text DEFAULT '',
  lux_feedback text DEFAULT '',
  mastery_level integer DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
  next_review date,
  review_interval integer DEFAULT 1,
  review_count integer DEFAULT 0,
  status text DEFAULT 'empty' CHECK (status IN ('empty', 'active', 'learning', 'mastered')),
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE cue_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES cue_cards(id),
  target_id uuid NOT NULL REFERENCES cue_cards(id),
  weight real DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 10.0),
  origin text DEFAULT 'auto' CHECK (origin IN ('auto', 'manual', 'review')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id)
);

CREATE TABLE cue_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cue_cards(id),
  reviewer text NOT NULL DEFAULT 'iris' CHECK (reviewer IN ('iris', 'lux')),
  review_type text NOT NULL CHECK (review_type IN ('fill_blank', 'feynman', 'association')),
  question text DEFAULT '',
  related_card_id uuid REFERENCES cue_cards(id),
  user_answer text DEFAULT '',
  lux_feedback text DEFAULT '',
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 2),
  reviewed_at timestamptz DEFAULT now()
);

CREATE TABLE cue_dark_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  constellation_id uuid REFERENCES cue_constellations(id),
  suggested_by uuid REFERENCES cue_cards(id),
  owner text NOT NULL DEFAULT 'iris' CHECK (owner IN ('iris', 'lux')),
  status text DEFAULT 'dark' CHECK (status IN ('dark', 'activated')),
  activated_card_id uuid REFERENCES cue_cards(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cue_cards_date ON cue_cards(date);
CREATE INDEX idx_cue_cards_status ON cue_cards(status);
CREATE INDEX idx_cue_cards_next_review ON cue_cards(next_review);
CREATE INDEX idx_cue_cards_constellation ON cue_cards(constellation_id);
CREATE INDEX idx_cue_reviews_card ON cue_reviews(card_id);
CREATE INDEX idx_cue_relations_source ON cue_relations(source_id);
CREATE INDEX idx_cue_relations_target ON cue_relations(target_id);

ALTER TABLE cue_constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_dark_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open" ON cue_constellations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cue_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cue_relations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cue_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cue_dark_stars FOR ALL USING (true) WITH CHECK (true);
