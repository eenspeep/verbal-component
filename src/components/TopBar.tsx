export type View = "swipe" | "playlists" | "thinking" | "settings";

interface Props {
  view: View;
  setView: (v: View) => void;
  playlistCount: number;
  thinkingCount: number;
  live: boolean;
}

const TABS: Array<{ id: View; label: string; icon: string }> = [
  { id: "swipe", label: "Swipe", icon: "🎴" },
  { id: "playlists", label: "Playlists", icon: "📜" },
  { id: "thinking", label: "Thinking", icon: "🤔" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function TopBar({ view, setView, playlistCount, thinkingCount, live }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">🎲</span>
        <span className="topbar__name">Questward</span>
        <span className={`topbar__mode ${live ? "topbar__mode--live" : ""}`}>
          {live ? "LIVE" : "DEMO"}
        </span>
      </div>
      <nav className="topbar__nav">
        {TABS.map((t) => {
          const badge =
            t.id === "playlists" ? playlistCount : t.id === "thinking" ? thinkingCount : 0;
          return (
            <button
              key={t.id}
              className={`tab ${view === t.id ? "tab--active" : ""}`}
              onClick={() => setView(t.id)}
            >
              <span className="tab__icon">{t.icon}</span>
              <span className="tab__label">{t.label}</span>
              {badge > 0 && <span className="tab__badge">{badge}</span>}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
