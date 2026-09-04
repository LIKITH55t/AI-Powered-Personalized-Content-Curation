import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const CARDS = [
  {
    id: "placements",
    title: "Placements",
    detail: "Internships, OA patterns, resumes, system design, CS fundamentals.",
  },
  {
    id: "exams",
    title: "Competitive Exams",
    detail: "UPSC / JEE / NEET / GATE — PYQ, revision, current affairs, ethics.",
  },
  {
    id: "skills",
    title: "Skill Learning",
    detail: "Courses, tutorials, engineering craft. No brainrot, no outrage panels.",
  },
];

export default function Goals() {
  const nav = useNavigate();
  const [profile, setProfile] = useState({ goal: "placements", prompt: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/profile")
      .then(setProfile)
      .catch(() => {});
  }, []);

  async function activate(id) {
    const next = { ...profile, goal: id };
    setProfile(next);
    try {
      await api("/api/profile", { method: "POST", body: next });
      setMsg("Goal switched. Feed will re-optimize.");
    } catch {
      setMsg("Saved locally. Start the API to persist.");
    }
  }

  async function savePrompt() {
    try {
      await api("/api/profile", { method: "POST", body: profile });
      await api("/api/intent", { method: "POST", body: { goal: profile.goal, prompt: profile.prompt } });
      nav("/app/feed");
    } catch {
      nav("/app/feed");
    }
  }

  return (
    <div className="px-5 py-8 md:px-10">
      <h1 className="font-display text-4xl">Goals & intent</h1>
      <p className="mt-2 max-w-2xl text-mist/70">
        Dynamic intent: changing a goal rewrites the criteria the scorer uses. Adaptive personalization
        still applies on top via likes, saves, and skips.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <button
            key={c.id}
            onClick={() => activate(c.id)}
            className={`glass rounded-3xl p-6 text-left ${profile.goal === c.id ? "ring-2 ring-gold" : ""}`}
          >
            <div className="text-lg font-semibold">{c.title}</div>
            <p className="mt-2 text-sm text-mist/70">{c.detail}</p>
          </button>
        ))}
      </div>
      <label className="mt-10 block text-sm text-mist/70">Natural-language objective</label>
      <textarea
        className="glass mt-2 w-full max-w-3xl resize-none rounded-3xl p-4"
        rows={5}
        value={profile.prompt || ""}
        onChange={(e) => setProfile({ ...profile, prompt: e.target.value })}
      />
      <div className="mt-4 flex items-center gap-4">
        <button onClick={savePrompt} className="rounded-full bg-gold px-5 py-2.5 font-semibold text-ink">
          Apply to feed
        </button>
        {msg && <span className="text-sm text-teal">{msg}</span>}
      </div>
    </div>
  );
}
