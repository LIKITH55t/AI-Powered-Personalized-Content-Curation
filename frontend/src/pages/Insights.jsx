import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Insights() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/insights")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return <div className="p-10 text-rose-300">Could not load insights. Is the API running?</div>;
  }
  if (!data) return <div className="p-10 text-mist/60">Computing personalization weights…</div>;

  const a = data.analytics;
  const fb = a.feedback || {};
  const maxW = Math.max(0.2, ...((a.topWeights || []).map((w) => Math.abs(w.weight))));

  return (
    <div className="px-5 py-8 md:px-10">
      <h1 className="font-display text-4xl">Adaptive personalization</h1>
      <p className="mt-2 max-w-2xl text-mist/70">
        Implicit and explicit signals reshape tag weights. The next batch of 10 is scored with those
        weights already applied.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Suppression rate" value={`${Math.round(a.suppressionRate * 100)}%`} />
        <Tile label="Shown / hidden" value={`${a.shown} / ${a.hidden}`} />
        <Tile label="Average match" value={a.avgScore} />
        <Tile label="Signals logged" value={Object.values(fb).reduce((s, n) => s + n, 0)} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="font-semibold text-gold">Feedback loop</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(fb).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-sm capitalize">
                  <span>{k}</span>
                  <span className="text-mist/60">{v}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-gold" style={{ width: `${Math.min(100, v * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="font-semibold text-gold">Tag weights</h2>
          <div className="mt-5 space-y-4">
            {(a.topWeights || []).length === 0 && (
              <p className="text-sm text-mist/60">Like or skip items in the feed to grow this chart.</p>
            )}
            {(a.topWeights || []).map((w) => (
              <div key={w.tag}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{w.tag}</span>
                  <span className={w.weight >= 0 ? "text-teal" : "text-rose-300"}>{w.weight}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={w.weight >= 0 ? "h-full bg-teal" : "h-full bg-rose-400"}
                    style={{ width: `${(Math.abs(w.weight) / maxW) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 glass rounded-3xl p-6">
        <h2 className="font-semibold text-gold">Platform split</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(data.platforms || {}).map(([name, v]) => (
            <div key={name} className="rounded-2xl bg-black/30 p-4">
              <div className="capitalize text-sm">{name}</div>
              <div className="mt-2 text-xs text-mist/60">
                {v.shown} kept · {v.hidden} hidden
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-xs uppercase tracking-wider text-mist/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
