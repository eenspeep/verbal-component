interface Props {
  keywords: string[];
}

/** The three auto-generated vibe keywords, shown before you press play. */
export default function KeywordChips({ keywords }: Props) {
  return (
    <div className="keywords" aria-label="Auto keywords">
      {keywords.map((k, i) => (
        <span className="chip" key={`${k}-${i}`}>
          {k}
        </span>
      ))}
    </div>
  );
}
