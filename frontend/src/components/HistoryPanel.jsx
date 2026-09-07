import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function HistoryPanel() {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replayingIndex, setReplayingIndex] = useState(null);

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/history");
      setHistoryData(data);
    } catch (err) {
      setError(err.message || "Failed to load intent history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleReplay(entry, index) {
    setReplayingIndex(index);
    try {
      await api("/api/intent", {
        method: "POST",
        body: { goal: entry.goal, prompt: entry.prompt },
      });
      navigate("/app/feed");
    } catch (err) {
      alert(`Replay failed: ${err.message || "Could not re-apply intent."}`);
      setReplayingIndex(null);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 mt-8">
        <div className="flex items-center gap-2 text-sm text-mist/60">
          <Loader2 size={16} className="animate-spin text-gold" />
          Loading intent prompt history…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-3xl p-6 mt-8 border-rose-500/20 text-rose-300 text-sm">
        {error}
      </div>
    );
  }

  const entries = historyData?.entries || [];

  return (
    <div className="glass rounded-3xl p-6 mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-gold font-semibold text-lg">
            <History size={20} />
            Prompt History &amp; Intent Replay
          </div>
          <p className="mt-1 text-xs text-mist/70">
            Revisit previously used natural-language objectives and see how they score against the current feed.
          </p>
        </div>
        <span className="rounded-full bg-gold/10 border border-gold/20 px-3 py-1 text-xs text-gold font-medium">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} recorded
        </span>
      </div>

      <div className="mt-2 py-2 text-[11px] text-mist/50 italic border-b border-white/5">
        * Per-entry analytics (shown, hidden, suppression, score) are calculated live against current corpus &amp; tag weights, not historical snapshots.
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold mb-3">
            <Sparkles size={22} />
          </div>
          <h3 className="text-base font-semibold text-white">No prompt history yet</h3>
          <p className="mt-1 text-sm text-mist/60 max-w-sm mx-auto">
            Submit a prompt in the Feed or Goals tab to start building your personal intent history.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {entries.map((entry, idx) => {
            const isReplaying = replayingIndex === idx;
            const stats = entry.stats || {};
            const suppressionPct = Math.round((stats.suppressionRate || 0) * 100);

            return (
              <div
                key={`${entry.ordinal}-${idx}`}
                className="rounded-2xl bg-black/30 border border-white/5 p-4 hover:border-white/15 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-mist/80">
                      {entry.label}
                    </span>
                    <span className="rounded-full bg-gold/15 text-gold px-2.5 py-0.5 font-medium">
                      {entry.goalLabel || entry.goal}
                    </span>
                  </div>

                  <button
                    disabled={isReplaying}
                    onClick={() => handleReplay(entry, idx)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/30 px-3.5 py-1.5 text-xs font-semibold text-gold transition disabled:opacity-50"
                  >
                    {isReplaying ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Replaying…
                      </>
                    ) : (
                      <>
                        <RotateCcw size={13} />
                        Replay intent
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-sm text-stone-200 font-sans leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5">
                  “{entry.prompt || "(Default goal profile vocabulary only)"}”
                </p>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                    <span className="text-mist/50 block text-[10px] uppercase tracking-wider">Shown</span>
                    <span className="font-semibold text-teal text-sm">{stats.shown ?? 0}</span>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                    <span className="text-mist/50 block text-[10px] uppercase tracking-wider">Hidden</span>
                    <span className="font-semibold text-rose-300 text-sm">{stats.hidden ?? 0}</span>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                    <span className="text-mist/50 block text-[10px] uppercase tracking-wider">Suppressed</span>
                    <span className="font-semibold text-mist/90 text-sm">{suppressionPct}%</span>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                    <span className="text-mist/50 block text-[10px] uppercase tracking-wider">Avg Score</span>
                    <span className="font-semibold text-gold text-sm">{stats.avgScore ?? 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
