const PLATFORMS = [
  {
    name: "YouTube",
    status: "Demo corpus + extension target",
    note: "DOM observer hides off-intent videos via CSS without touching YouTube’s backend.",
  },
  {
    name: "X (Twitter)",
    status: "Live in the extension",
    note: "A DOM adapter tags real tweets and scores them against your active intent in real time across the scrolling feed.",
  },
  {
    name: "Reddit",
    status: "Modular adapter",
    note: "Thread titles and bodies scored with the same intent vector.",
  },
  {
    name: "LinkedIn",
    status: "Roadmap",
    note: "Hiring spam and engagement bait suppressed; career writing kept.",
  },
];

export default function Platforms() {
  return (
    <div className="px-5 py-8 md:px-10">
      <h1 className="font-display text-4xl">Cross-platform expansion</h1>
      <p className="mt-2 max-w-2xl text-mist/70">
        Modular architecture: one intent interpreter, one scorer, many surface adapters. The Chrome
        extension in <code className="text-gold">/extension</code> is the non-intrusive hide layer.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((p) => (
          <div key={p.name} className="glass rounded-3xl p-6">
            <div className="text-xs uppercase tracking-wider text-gold">{p.status}</div>
            <h2 className="mt-2 text-2xl font-semibold">{p.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist/75">{p.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 glass rounded-3xl p-6 text-sm text-mist/75">
        <div className="font-semibold text-white">Load unpacked extension</div>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Open chrome://extensions and enable Developer mode.</li>
          <li>Load unpacked → select the project’s extension folder.</li>
          <li>Open the popup, paste your intent, visit the included demo page.</li>
        </ol>
      </div>
    </div>
  );
}
