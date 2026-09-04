import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Compass, Layers, Radio } from "lucide-react";
import Logo from "../components/Brand";

const links = [
  { to: "/app/feed", label: "Feed", icon: Radio },
  { to: "/app/goals", label: "Goals", icon: Compass },
  { to: "/app/insights", label: "Insights", icon: BarChart3 },
  { to: "/app/platforms", label: "Platforms", icon: Layers },
];

export default function AppShell() {
  return (
    <div className="starfield min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/5 md:border-b-0 md:border-r md:min-h-screen">
        <div className="p-5">
          <a href="/">
            <Logo />
          </a>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-4">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                    isActive ? "bg-gold/15 text-gold" : "text-mist/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={16} />
                {l.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden px-5 pt-8 text-xs text-mist/50 md:block">
          Adaptive weights update from likes, saves, clicks, and skips.
        </div>
      </aside>
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
