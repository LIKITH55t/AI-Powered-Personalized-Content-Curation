import { Bookmark, EyeOff, Heart, MousePointerClick, SkipForward } from "lucide-react";

const platformLabel = {
  youtube: "YouTube",
  x: "X",
  reddit: "Reddit",
  linkedin: "LinkedIn",
};

export default function PostCard({ item, dimmed, onAction }) {
  const tone = item.score >= 75 ? "text-teal" : item.score >= 48 ? "text-gold" : "text-rose-300";
  return (
    <article className={`glass rounded-3xl p-5 ${dimmed ? "opacity-45" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-mist/50">
            <span>{platformLabel[item.platform] || item.platform}</span>
            <span>·</span>
            <span>{item.type}</span>
            {item.duration ? <span>· {item.duration}</span> : null}
          </div>
          <div className="mt-2 font-semibold">{item.author}</div>
          <div className="text-xs text-mist/60">{item.handle}</div>
        </div>
        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-black/30 text-lg font-semibold ${tone}`}>
          {item.score}
        </div>
      </div>
      {item.title ? <h3 className="mt-4 text-lg leading-snug">{item.title}</h3> : null}
      <p className="mt-2 text-sm leading-relaxed text-mist/80">{item.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(item.tags || []).slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-mist/70">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs text-mist/50">{(item.reasons || []).join(" · ")}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { id: "click", icon: MousePointerClick, label: "Open" },
          { id: "like", icon: Heart, label: "Like" },
          { id: "save", icon: Bookmark, label: "Save" },
          { id: "skip", icon: SkipForward, label: "Skip" },
          { id: "hide", icon: EyeOff, label: "Hide" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => onAction(item, a.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist/80 hover:bg-white/5"
            >
              <Icon size={13} />
              {a.label}
            </button>
          );
        })}
      </div>
    </article>
  );
}
