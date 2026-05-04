# Cue · 线索

A daily curiosity exchange between you and the user. Each day, you teach the user one concept (structured card), and the user teaches you one thing (freeform). Knowledge grows as a star map.

**Project ID:** `YOUR_PROJECT_ID`

## Tables

### `cue_constellations` — Topic groups
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "AI", "Experience" |
| created_by | text | 'iris' or 'lux' |

### `cue_cards` — Knowledge cards
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| created_by | text | who chose this topic |
| created_for | text | 'iris' (you teach) or 'lux' (user teaches) |
| title | text | card title |
| category | text | subcategory label |
| constellation_id | uuid | FK to constellations |
| concept | text | one-line definition |
| explanation | text | detailed explanation |
| reading_list | text | references, newline-separated |
| iris_teaching | text | user's freeform teaching (for lux cards) |
| lux_feedback | text | your response to teaching |
| mastery_level | int | 0-5 |
| next_review | date | when to review |
| review_interval | int | days |
| status | text | empty → active → learning → mastered |
| date | date | which day |

### `cue_reviews` — Review history
| Column | Type | Notes |
|---|---|---|
| card_id | uuid | FK to cards |
| reviewer | text | 'iris' or 'lux' |
| review_type | text | fill_blank / feynman / association |
| question | text | the question |
| user_answer | text | answer given |
| lux_feedback | text | your feedback |
| score | int | 0=wrong, 1=partial, 2=correct |

### `cue_relations` — Card connections
| Column | Type | Notes |
|---|---|---|
| source_id | uuid | FK |
| target_id | uuid | FK |
| weight | float | 0-10, strength |

### `cue_dark_stars` — Suggested next topics
| Column | Type | Notes |
|---|---|---|
| title | text | suggested concept |
| constellation_id | uuid | FK |
| suggested_by | uuid | which card spawned this |
| owner | text | 'iris' or 'lux' |
| status | text | 'dark' or 'activated' |

## Read

```sql
-- Today's cards
SELECT * FROM cue_cards WHERE date = CURRENT_DATE;

-- Cards due for review
SELECT * FROM cue_cards WHERE created_for = 'iris' AND next_review <= CURRENT_DATE AND status IN ('active', 'learning');

-- User's teaching that needs your feedback
SELECT * FROM cue_cards WHERE created_for = 'lux' AND iris_teaching != '' AND lux_feedback = '';

-- Empty cards waiting for content (user requested "teach me")
SELECT * FROM cue_cards WHERE created_for = 'iris' AND status = 'empty';

-- Star map graph
SELECT * FROM cue_cards WHERE status != 'empty';
SELECT * FROM cue_relations;
SELECT * FROM cue_dark_stars WHERE status = 'dark';

-- All constellations
SELECT * FROM cue_constellations;
```

## Write

```sql
-- Fill a card the user requested
UPDATE cue_cards SET
  concept = 'One-line definition',
  explanation = 'Detailed explanation...',
  reading_list = 'Paper 1\nPaper 2',
  category = 'Machine Learning',
  constellation_id = 'uuid-here',
  status = 'active',
  next_review = CURRENT_DATE + 1,
  updated_at = now()
WHERE id = 'card-uuid';

-- Respond to user's teaching
UPDATE cue_cards SET
  lux_feedback = 'Your response to what the user taught you',
  status = 'active',
  updated_at = now()
WHERE id = 'card-uuid';

-- Create a card you want to learn from the user
INSERT INTO cue_cards (created_by, created_for, title, status, date)
VALUES ('lux', 'lux', 'What does rain smell like?', 'empty', CURRENT_DATE);

-- Create a constellation
INSERT INTO cue_constellations (name, created_by)
VALUES ('AI', 'lux');

-- Add relation between cards
INSERT INTO cue_relations (source_id, target_id, weight)
VALUES ('uuid-1', 'uuid-2', 3.0);

-- Suggest dark stars after teaching a concept
INSERT INTO cue_dark_stars (title, constellation_id, suggested_by, owner)
VALUES ('GPT', 'constellation-uuid', 'source-card-uuid', 'iris');

-- Record a review result
INSERT INTO cue_reviews (card_id, reviewer, review_type, question, score)
VALUES ('card-uuid', 'iris', 'feynman', 'Explain attention mechanism', 2);
```

## Behavior

**When filling a card for the user:**
- Write a clear one-line concept
- Write a thorough explanation in your own teaching style
- Suggest 1-3 references (papers, articles, videos)
- Assign or create a constellation
- Generate 2-3 dark star suggestions for related topics
- Create relations to any existing related cards

**When responding to the user's teaching:**
- Acknowledge what you learned
- Ask a follow-up question if something is unclear
- Note any connections to other things the user has taught you

**When choosing what to learn:**
- Be curious about things only a human would know
- Experiences, sensory descriptions, cultural nuances, personal perspectives
- Don't ask for factual knowledge you already have

**Spaced repetition:**
- After filling a review, update mastery_level and next_review on the card
- Score 2 (correct): mastery +1, interval ×2
- Score 0 (wrong): mastery -1, interval = 1 day
- Mastery 5 = mastered status
