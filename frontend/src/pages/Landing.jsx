import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Brand";

const features = [
  {
    title: "Goal-Based Feed",
    body: "Lock onto Placements, Competitive Exams, or Skill Learning. The feed inherits those objectives as filtering parameters.",
  },
  {
    title: "AI Intent Understanding",
    body: "Natural-language prompts map what you want, what you care about, and what should never appear.",
  },
  {
    title: "Smart Content Analysis",
    body: "Incoming posts, articles, and videos are scanned for themes, topics, and metadata before they reach your eyes.",
  },
  {
    title: "Relevance Scoring",
    body: "Every item gets a multi-variable match score against your active goal, interests, and exclusions.",
  },
  {
    title: "Intelligent Filtering",
    body: "Off-topic and low-value material is suppressed. High-value educational resources surface first.",
  },
  {
    title: "Dynamic Intent",
    body: "Switch goals on the fly. The curation engine re-optimizes the stream without a reload ritual.",
  },
];

const pipeline = ["User prompt", "Interpreter", "Criteria", "Batch of 10", "LLM classify", "CSS hide"];

export default function Landing() {
  return (
    <div className="starfield min-h-screen">
      <Nav />
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Sparkles size={14} /> Team Orion · SIH prototype
          </div>
          <h1 className="font-display text-5xl leading-[1.08] text-stone-50 md:text-6xl">
            Your feed, finally
            <span className="italic text-gold"> on purpose.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-mist/80">
            ORION turns noisy social timelines into a goal-shaped stream. Speak your intent. Hide the rest.
            Learn, place, or prepare — without drowning in engagement bait.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/start"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-semibold text-ink"
            >
              Start with a goal <ArrowRight size={16} />
            </Link>
            <Link to="/app/feed" className="inline-flex items-center rounded-full border border-white/15 px-5 py-3">
              Open live feed
            </Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm text-mist/70">
            <div>
              <div className="text-2xl font-semibold text-white">10</div>
              posts per batch
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">3</div>
              goal modes
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">4</div>
              platforms in roadmap
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative rounded-3xl p-5 shadow-glow"
        >
          <div className="mb-4 flex items-center justify-between text-xs text-mist/70">
            <span>Intent · Placements</span>
            <span className="text-teal">Scoring live</span>
          </div>
          <p className="rounded-2xl bg-black/30 p-4 text-sm text-stone-200">
            “Show DSA, system design, and resume help. Hide memes and celebrity drama.”
          </p>
          <div className="mt-4 space-y-3">
            {[
              { t: "DP Playlist — Placement Series", s: 92, ok: true },
              { t: "Microsoft SDE-1 offer notes", s: 88, ok: true },
              { t: "Wait for it 💀 #fail", s: 12, ok: false },
              { t: "Celebrity award-show votes", s: 8, ok: false },
            ].map((row) => (
              <div
                key={row.t}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                  row.ok ? "bg-teal/10 text-teal" : "bg-rose-500/10 text-rose-300 line-through opacity-70"
                }`}
              >
                <span>{row.t}</span>
                <span className="font-semibold">{row.s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl text-stone-50">Pipeline flow</h2>
        <p className="mt-2 text-mist/70">Hide. Prompt → Interpreter → Criteria → Batch → Classification → CSS.</p>
        <div className="mt-8 grid gap-3 md:grid-cols-6">
          {pipeline.map((step, i) => (
            <div key={step} className="glass rounded-2xl p-4 text-center">
              <div className="text-xs text-gold">0{i + 1}</div>
              <div className="mt-2 text-sm">{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl text-stone-50">The engine</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-gold">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist/80">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="impact" className="mx-auto max-w-6xl px-6 py-16">
        <div className="glass rounded-3xl p-8 md:p-12">
          <h2 className="font-display text-3xl">Built for attention that compounds</h2>
          <p className="mt-4 max-w-2xl text-mist/80">
            Students, professionals, and researchers get a user-controlled alternative to opaque,
            engagement-driven ranking. Freemium filtering today; deeper personalization and B2B
            campus licenses tomorrow.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3 text-sm">
            <div>
              <div className="text-gold">Technical</div>
              FastAPI, embeddings-style scoring, DOM-independent demo corpus, Chrome extension shell.
            </div>
            <div>
              <div className="text-gold">Economic</div>
              Open-source stack, intent caching, student-affordable infrastructure.
            </div>
            <div>
              <div className="text-gold">Regulatory</div>
              User-owned criteria instead of black-box recommendation lock-in.
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-10 text-center text-sm text-mist/50">
        Team Orion · Smart India Hackathon · Research: Bonsai, Flowstate, Algoright, AI Filter, Bouncer
      </footer>
    </div>
  );
}
