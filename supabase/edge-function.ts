import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/cue\/?/, "");
    const segments = path.split("/").filter(Boolean);
    const resource = segments[0] || "";
    const id = segments[1] || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // ── GET ──────────────────────────────

    if (req.method === "GET") {
      // GET /cards?date=2026-05-04
      // GET /cards?status=learning
      // GET /cards?review_due=true (next_review <= today)
      if (resource === "cards") {
        let q = sb.from("cue_cards").select("*, cue_constellations(name)");
        const date = url.searchParams.get("date");
        const status = url.searchParams.get("status");
        const reviewDue = url.searchParams.get("review_due");
        const forUser = url.searchParams.get("for");
        if (date) q = q.eq("date", date);
        if (status) q = q.eq("status", status);
        if (reviewDue === "true") q = q.lte("next_review", new Date().toISOString().split("T")[0]);
        if (forUser) q = q.eq("created_for", forUser);
        q = q.order("date", { ascending: false });
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // GET /constellations
      if (resource === "constellations") {
        const { data, error } = await sb.from("cue_constellations").select("*").order("created_at");
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // GET /reviews?card_id=xxx
      if (resource === "reviews") {
        let q = sb.from("cue_reviews").select("*");
        const cardId = url.searchParams.get("card_id");
        if (cardId) q = q.eq("card_id", cardId);
        q = q.order("reviewed_at", { ascending: false });
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // GET /relations?card_id=xxx
      if (resource === "relations") {
        const cardId = url.searchParams.get("card_id");
        let q = sb.from("cue_relations").select("*, source:cue_cards!source_id(id, title), target:cue_cards!target_id(id, title)");
        if (cardId) q = q.or(`source_id.eq.${cardId},target_id.eq.${cardId}`);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // GET /dark-stars?constellation_id=xxx
      if (resource === "dark-stars") {
        let q = sb.from("cue_dark_stars").select("*, cue_constellations(name)").eq("status", "dark");
        const cid = url.searchParams.get("constellation_id");
        if (cid) q = q.eq("constellation_id", cid);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // GET /graph (all nodes + edges for star map)
      if (resource === "graph") {
        const [cards, darkStars, relations, constellations] = await Promise.all([
          sb.from("cue_cards").select("id, title, status, created_for, mastery_level, constellation_id").neq("status", "empty"),
          sb.from("cue_dark_stars").select("id, title, constellation_id, owner").eq("status", "dark"),
          sb.from("cue_relations").select("source_id, target_id, weight"),
          sb.from("cue_constellations").select("*"),
        ]);
        return json({
          nodes: [
            ...(cards.data || []).map((c: any) => ({ ...c, nodeType: "card" })),
            ...(darkStars.data || []).map((d: any) => ({ ...d, nodeType: "dark", status: "dark", created_for: d.owner })),
          ],
          edges: relations.data || [],
          constellations: constellations.data || [],
        });
      }

      return json({ error: "Not found" }, 404);
    }

    // ── POST ─────────────────────────────

    if (req.method === "POST") {
      const body = await req.json();

      // POST /cards
      if (resource === "cards") {
        const { data, error } = await sb.from("cue_cards").insert(body).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      // POST /constellations
      if (resource === "constellations") {
        const { data, error } = await sb.from("cue_constellations").insert(body).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      // POST /reviews
      if (resource === "reviews") {
        const { data, error } = await sb.from("cue_reviews").insert(body).select().single();
        if (error) return json({ error: error.message }, 400);

        // Update card mastery based on score
        if (body.card_id && body.score !== undefined) {
          const { data: card } = await sb.from("cue_cards").select("mastery_level, review_interval, review_count").eq("id", body.card_id).single();
          if (card) {
            let newMastery = card.mastery_level;
            let newInterval = card.review_interval;
            if (body.score === 2) { // correct
              newMastery = Math.min(5, newMastery + 1);
              newInterval = Math.min(30, newInterval * 2);
            } else if (body.score === 0) { // wrong
              newMastery = Math.max(0, newMastery - 1);
              newInterval = 1;
            }
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + newInterval);
            await sb.from("cue_cards").update({
              mastery_level: newMastery,
              review_interval: newInterval,
              review_count: card.review_count + 1,
              next_review: nextReview.toISOString().split("T")[0],
              status: newMastery >= 5 ? "mastered" : "learning",
              updated_at: new Date().toISOString(),
            }).eq("id", body.card_id);
          }
        }
        return json(data, 201);
      }

      // POST /relations
      if (resource === "relations") {
        const { data, error } = await sb.from("cue_relations").insert(body).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      // POST /dark-stars
      if (resource === "dark-stars") {
        const { data, error } = await sb.from("cue_dark_stars").insert(body).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      return json({ error: "Not found" }, 404);
    }

    // ── PATCH ────────────────────────────

    if (req.method === "PATCH") {
      const body = await req.json();

      // PATCH /cards/:id
      if (resource === "cards" && id) {
        body.updated_at = new Date().toISOString();
        const { data, error } = await sb.from("cue_cards").update(body).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // PATCH /constellations/:id
      if (resource === "constellations" && id) {
        const { data, error } = await sb.from("cue_constellations").update(body).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // PATCH /relations/:id
      if (resource === "relations" && id) {
        const { data, error } = await sb.from("cue_relations").update(body).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      // PATCH /dark-stars/:id (activate)
      if (resource === "dark-stars" && id) {
        const { data, error } = await sb.from("cue_dark_stars").update(body).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      return json({ error: "Not found" }, 404);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
