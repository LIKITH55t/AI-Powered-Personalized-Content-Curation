import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PostCard from "../components/PostCard";
import { api } from "../lib/api";

const GOALS = [
  { id: "placements", label: "Placements" },
  { id: "exams", label: "Competitive Exams" },
  { id: "skills", label: "Skill Learning" },
];

export default function Feed() {
  const [goal, setGoal] = useState("placements");
  const [prompt, setPrompt] = useState("");
  const [intent, setIntent] = useState(null);
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState("");

  async function load(nextGoal = goal, nextPrompt = prompt) {
    setBusy(true);
    setNote("Scoring batch of 10…");
    try {
      const q = new URLSearchParams({ goal: nextGoal, prompt: nextPrompt });
      const data = await api(`/api/feed?${q.toString()}`);
      setIntent(data.intent);
      setItems(data.items);
      setAnalytics(data.analytics);
      setGoal(data.intent.goal);
      if (!nextPrompt) setPrompt(data.intent.prompt || "");
    } catch (err) {
      setNote(err.message || "Backend offline. Start FastAPI on port 8000.");
    } finally {
      setBusy(false);
      setTimeout(() => setNote(""), 900);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchGoal(id) {
    setGoal(id);
    await load(id, prompt);
  }

  async function applyIntent(e) {
    e.preventDefault();
    try {
      await api("/api/intent", { method: "POST", body: { goal, prompt } });
    } catch {
      /* still try feed */
    }
    await load(goal, prompt);
  }

  async function onAction(item, action) {
    try {
      const data = await api("/api/feedback", { method: "POST", body: { postId: item.id, action } });
      setItems(data.items);
      setAnalytics(data.analytics);
    } catch {
      setItems((prev) => prev.filter((p) => !(action === "hide" && p.id === item.id)));
    }
  }

  const visible = items.filter((p) => p.visible);
  const hidden = items.filter((p) => !p.visible);
  const shown = useMemo(() => (showHidden ? items : visible), [showHidden, items, visible]);

  return (
    <div className="px-5 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Curated stream</h1>
          <p className="mt-1 text-sm text-mist/70">
            {intent?.summary || "Loading intent criteria…"}
          </p>
        </div>
        {analytics && (
          <div className="flex gap-4 text-sm">
            <Stat k="Shown" v={analytics.shown} />
            <Stat k="Hidden" v={analytics.hidden} />
            <Stat k="Avg score" v={analytics.avgScore} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => switchGoal(g.id)}
            className={`rounded-full px-4 py-2 text-sm ${
              goal === g.id ? "bg-gold text-ink font-semibold" : "border border-white/10 text-mist/80"
            }`}
          >
            {g.label}
          </button>
        ))}
        <button
          onClick={() => setShowHidden((s) => !s)}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist/80"
        >
          {showHidden ? "Focus on matches" : "Reveal suppressed"}
        </button>
      </div>

      <form onSubmit={applyIntent} className="mt-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe what belongs in this feed — and what does not."
          className="glass w-full resize-none rounded-3xl p-4 outline-none focus:ring-2 focus:ring-gold/40"
        />
        <button type="submit" className="mt-3 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink">
          Re-interpret intent
        </button>
      </form>

      {intent && (
        <div className="mt-5 flex flex-wrap gap-2">
          {intent.interests?.slice(0, 6).map((t) => (
            <span key={t} className="rounded-full bg-teal/10 px-3 py-1 text-xs text-teal">
              + {t}
            </span>
          ))}
          {intent.exclusions?.slice(0, 5).map((t) => (
            <span key={t} className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
              − {t}
            </span>
          ))}
        </div>
      )}

      {(busy || note) && (
        <div className="mt-6 inline-flex items-center gap-2 text-sm text-gold">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {note || "Working…"}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {shown.map((item) => (
          <PostCard key={item.id} item={item} dimmed={!item.visible} onAction={onAction} />
        ))}
      </div>

      {!showHidden && hidden.length > 0 && (
        <p className="mt-8 text-center text-sm text-mist/50">
          {hidden.length} items suppressed as off-topic or low-value. Reveal them to inspect scores.
        </p>
      )}
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-mist/50">{k}</div>
      <div className="text-xl font-semibold">{v}</div>
    </div>
  );
}
