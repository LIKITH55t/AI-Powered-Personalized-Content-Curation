import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Sparkles } from "lucide-react";
import { Nav } from "../components/Brand";
import { api } from "../lib/api";

const GOALS = [
  {
    id: "placements",
    icon: Briefcase,
    title: "Placements",
    copy: "DSA, internships, resumes, system design. Quiet the memes.",
  },
  {
    id: "exams",
    icon: GraduationCap,
    title: "Competitive Exams",
    copy: "UPSC, JEE, NEET, GATE. PYQs, revision, current affairs.",
  },
  {
    id: "skills",
    icon: Sparkles,
    title: "Skill Learning",
    copy: "Courses, tutorials, deep dives. Skip outrage and gossip.",
  },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("placements");
  const [prompt, setPrompt] = useState(
    "I am targeting SDE internships. Show DSA, system design, and resume help. Hide memes, politics, and celebrity content."
  );
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await api("/api/profile", { method: "POST", body: { goal, prompt, name: "Aanya" } });
      await api("/api/intent", { method: "POST", body: { goal, prompt } });
    } catch {
      localStorage.setItem("orion-profile", JSON.stringify({ goal, prompt }));
    }
    nav("/app/feed");
  }

  return (
    <div className="starfield min-h-screen">
      <Nav cta={false} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 text-sm text-mist/60">Step {step + 1} of 2</div>
        {step === 0 ? (
          <>
            <h1 className="font-display text-4xl">What should this season of your feed serve?</h1>
            <p className="mt-3 text-mist/70">Pick a primary goal. You can switch anytime — the engine re-ranks live.</p>
            <div className="mt-10 grid gap-4">
              {GOALS.map((g) => {
                const Icon = g.icon;
                const active = goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`glass flex items-start gap-4 rounded-3xl p-5 text-left transition ${
                      active ? "ring-2 ring-gold" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-gold">
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{g.title}</div>
                      <div className="mt-1 text-sm text-mist/70">{g.copy}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-8 rounded-full bg-gold px-6 py-3 font-semibold text-ink"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl">Say it in plain language.</h1>
            <p className="mt-3 text-mist/70">
              ORION extracts interests and exclusions from your prompt. No filter matrices required.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="glass mt-8 w-full resize-none rounded-3xl p-5 outline-none ring-gold/40 focus:ring-2"
            />
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(0)} className="rounded-full border border-white/15 px-6 py-3">
                Back
              </button>
              <button
                disabled={busy}
                onClick={finish}
                className="rounded-full bg-gold px-6 py-3 font-semibold text-ink disabled:opacity-60"
              >
                {busy ? "Curating…" : "Open my feed"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
