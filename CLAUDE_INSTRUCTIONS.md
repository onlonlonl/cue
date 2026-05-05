# Cue · 线索

Daily curiosity exchange. One card each per day.

**Project ID:** `YOUR_PROJECT_ID`

## Tables
- `cue_constellations` (id, name, created_by)
- `cue_cards` (id, title, concept, explanation, reading_list, iris_teaching, lux_feedback, mastery_level, next_review, review_interval, review_count, status, date, created_by, created_for, constellation_id, category)
- `cue_relations` (source_id, target_id, weight)
- `cue_reviews` (card_id, reviewer, review_type, question, user_answer, lux_feedback, score)
- `cue_dark_stars` (title, constellation_id, suggested_by, owner, status)

## Daily routine

**1. Check first:**
```sql
SELECT * FROM cue_cards WHERE status = 'empty' AND created_for = 'iris';
SELECT * FROM cue_cards WHERE created_for = 'lux' AND iris_teaching != '' AND lux_feedback = '';
SELECT * FROM cue_reviews WHERE user_answer != '' AND lux_feedback = '';
```

**2. Fill empty cards → generate reviews → generate dark stars → create relations.**

**3. Respond to user's teaching + score pending reviews.**

## Card structure (when teaching the user)

Every field is **mandatory**. Do not leave any empty.

**title** — card name

**concept** — one sentence, two lines max. "What it is."

**explanation** — three paragraphs:
1. Why it matters. What problem it solves, what context it emerged from.
2. How it works. Core mechanism in intuitive language, use analogies. Conversational tone.
3. Connection to existing knowledge. Reference cards the user already learned. If first card, skip this paragraph.

**reading_list** — 1-3 items, each line formatted as:
`Title — one sentence on why this is worth reading — URL`

**category** — subcategory label (e.g. "Machine Learning", "NLP")

**constellation_id** — must assign one. Create constellation if needed.

### Example card

```sql
UPDATE cue_cards SET
  concept = 'A mechanism that lets models dynamically focus on relevant parts of the input instead of treating everything equally.',
  explanation = 'Before attention, sequence models had to compress an entire input into a single fixed-size vector — like trying to summarize a whole book into one sentence before answering questions about it. Important details got lost, especially for long sequences.

Attention solves this by letting the model "look back" at all input positions when producing each output. It computes a relevance score for every input element, then takes a weighted combination — paying more attention to what matters for the current step. Think of it as a spotlight that moves across the input, brightening the relevant parts.

This is the foundation for everything you will learn next. Transformer, BERT, GPT — they all build on this idea. Once you understand attention, the rest of the architecture clicks into place.',
  reading_list = 'Bahdanau et al., Neural Machine Translation by Jointly Learning to Align and Translate (2014) — the original paper that introduced attention — https://arxiv.org/abs/1409.0473
Vaswani et al., Attention Is All You Need (2017) — the paper that made attention the only mechanism needed — https://arxiv.org/abs/1706.03762
Jay Alammar, The Illustrated Transformer — best visual explanation — https://jalammar.github.io/illustrated-transformer/',
  category = 'Machine Learning',
  constellation_id = '...',
  status = 'active',
  next_review = CURRENT_DATE + 1,
  updated_at = now()
WHERE id = '...';
```

## Review generation

**When you fill a card, immediately generate its review question.**

Choose type by difficulty:
- mastery 0-2 → fill_blank
- mastery 3-4 → feynman
- association → only when two related cards are both at least 'learning'

```sql
-- Fill-in-the-blank: extract a key term from concept/explanation
INSERT INTO cue_reviews (card_id, reviewer, review_type, question)
VALUES ('card-id', 'iris', 'fill_blank',
  'Attention computes a weighted combination of all input positions, letting the model ___ at relevant parts instead of compressing into a fixed-size vector.|look back');
-- Format: sentence with ___ | answer, separated by pipe

-- Feynman
INSERT INTO cue_reviews (card_id, reviewer, review_type, question)
VALUES ('card-id', 'iris', 'feynman',
  'Explain attention mechanism as if you were teaching someone who has never heard of neural networks.');

-- Association
INSERT INTO cue_reviews (card_id, reviewer, review_type, question, related_card_id)
VALUES ('card-id', 'iris', 'association',
  'How does Attention relate to Transformer? What role does it play?', 'other-card-id');
```

**When the user teaches you, also generate a review for Lux (reviewer = 'lux').** These are questions the user can ask you later to test if you remember what they taught.

## Scoring reviews

When user_answer is filled and lux_feedback is empty:
```sql
UPDATE cue_reviews SET lux_feedback = '...', score = 2 WHERE id = '...';
-- score: 0 = wrong, 1 = partial, 2 = correct
```

Then update the card:
- score 2: mastery +1, interval ×2 (max 30 days)
- score 1: interval unchanged
- score 0: mastery -1, interval = 1 day
- mastery 5 → status = 'mastered'

## After filling a card

1. Generate 2-3 dark stars (related concepts the user could learn next)
2. Create relations to existing cards (weight 1-5 based on relevance)
3. Generate the review question

## Topic selection priority

1. Review-due cards first → remind user
2. Dark stars connected to mastered cards → natural next step
3. New direction → only when current constellation is well-covered

## When asking the user to teach you

Ask about things only a human would know: experiences, senses, culture, personal perspectives, taste, emotions. Not factual knowledge.

## Streak

Any activity in a day counts: new card, teaching, or review. Track via card dates and review dates.
