interface Props {
  onNo: () => void;
  onThinking: () => void;
  onSort: () => void;
  onYes: () => void;
  activePlaylistName: string | null;
  disabled?: boolean;
}

export default function ActionBar({
  onNo,
  onThinking,
  onSort,
  onYes,
  activePlaylistName,
  disabled,
}: Props) {
  return (
    <div className="actionbar" role="group" aria-label="Decision actions">
      <button className="act act--no" onClick={onNo} disabled={disabled} title="No (←)">
        <span className="act__icon">✕</span>
        <span className="act__label">Nope</span>
      </button>
      <button className="act act--think" onClick={onThinking} disabled={disabled} title="Still thinking (↑)">
        <span className="act__icon">🤔</span>
        <span className="act__label">Thinking</span>
      </button>
      <button className="act act--sort" onClick={onSort} disabled={disabled} title="Sort into another playlist (S)">
        <span className="act__icon">↗</span>
        <span className="act__label">Sort</span>
      </button>
      <button className="act act--yes" onClick={onYes} disabled={disabled} title={`Add to ${activePlaylistName ?? "playlist"} (→)`}>
        <span className="act__icon">♥</span>
        <span className="act__label">{activePlaylistName ? `Yes → ${activePlaylistName}` : "Yes"}</span>
      </button>
    </div>
  );
}
