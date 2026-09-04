import { Link } from "react-router-dom";

export default function Logo({ size = "md" }) {
  const px = size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-sm";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${px} grid place-items-center rounded-2xl bg-gradient-to-br from-gold to-amber-200 text-ink font-semibold shadow-glow`}
      >
        ✦
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[0.22em] text-gold">ORION</div>
        <div className="text-[11px] text-mist/70 -mt-0.5">Goal-Based Feed</div>
      </div>
    </div>
  );
}

export function Nav({ cta = true }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-mist/80 md:flex">
          <a href="#how" className="hover:text-white">
            How it works
          </a>
          <a href="#features" className="hover:text-white">
            Engine
          </a>
          <a href="#impact" className="hover:text-white">
            Impact
          </a>
          <Link to="/app/feed" className="hover:text-white">
            Live demo
          </Link>
        </nav>
        {cta && (
          <Link
            to="/start"
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-amber-200"
          >
            Set your intent
          </Link>
        )}
      </div>
    </header>
  );
}
