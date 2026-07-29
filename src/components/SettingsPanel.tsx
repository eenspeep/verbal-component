import { useState } from "react";
import type { Settings } from "../types";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onConnectGoogle: () => Promise<void>;
  onReset: () => void;
  live: boolean;
  googleConnected: boolean;
}

export default function SettingsPanel({
  settings,
  onChange,
  onConnectGoogle,
  onReset,
  live,
  googleConnected,
}: Props) {
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function connect() {
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnectGoogle();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Settings</h2>
        <p className="panel__sub">
          Verbal Component runs in <strong>demo mode</strong> out of the box. Add your own Google
          credentials to switch on real search, playback, and playlist syncing.
        </p>
      </div>

      <div className="settings">
        <section className="settings__card">
          <h3>1 · YouTube Data API key</h3>
          <p className="settings__hint">
            Powers real search &amp; playback. Create one in Google Cloud Console → APIs &amp;
            Services → Credentials, with the <em>YouTube Data API v3</em> enabled.
          </p>
          <input
            className="settings__input"
            type="password"
            placeholder="AIza…"
            value={settings.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value.trim() })}
            autoComplete="off"
            spellCheck={false}
          />
          <div className={`settings__status ${live ? "ok" : ""}`}>
            {live ? "✓ Live mode active" : "Demo mode (no key)"}
          </div>
        </section>

        <section className="settings__card">
          <h3>2 · OAuth Client ID <span className="settings__opt">(for syncing playlists)</span></h3>
          <p className="settings__hint">
            Lets Verbal Component create playlists on <em>your</em> account (they show up in YouTube
            Music). Create an <em>OAuth 2.0 Client ID</em> of type “Web application”, and add this
            app’s URL to “Authorized JavaScript origins”.
          </p>
          <input
            className="settings__input"
            type="text"
            placeholder="…apps.googleusercontent.com"
            value={settings.oauthClientId}
            onChange={(e) => onChange({ oauthClientId: e.target.value.trim() })}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="settings__row">
            <button
              className="btn"
              onClick={connect}
              disabled={!settings.oauthClientId || connecting}
            >
              {connecting ? "Connecting…" : googleConnected ? "Reconnect Google" : "Connect Google"}
            </button>
            <span className={`settings__status ${googleConnected ? "ok" : ""}`}>
              {googleConnected ? "✓ Connected" : "Not connected"}
            </span>
          </div>
          {connectError && <div className="settings__error">{connectError}</div>}
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={(e) => onChange({ autoSync: e.target.checked })}
            />
            Auto-add “Yes” &amp; “Sort” to YouTube instantly (otherwise sync per playlist on demand)
          </label>
        </section>

        <section className="settings__card">
          <h3>Your origin</h3>
          <p className="settings__hint">
            Add this exact URL to your OAuth client’s Authorized JavaScript origins:
          </p>
          <code className="settings__origin">{window.location.origin}</code>
        </section>

        <section className="settings__card settings__card--danger">
          <h3>Reset</h3>
          <p className="settings__hint">
            Clears all local playlists, the thinking queue, and swipe history from this browser.
            Does not touch anything already synced to YouTube.
          </p>
          <button
            className="btn btn--danger"
            onClick={() => {
              if (confirm("Reset all local Verbal Component data in this browser?")) onReset();
            }}
          >
            Reset local data
          </button>
        </section>
      </div>
    </div>
  );
}
