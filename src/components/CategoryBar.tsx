import { useEffect, useState } from "react";

interface Props {
  category: string;
  onSearch: (category: string) => void;
}

const PRESETS = ["Pokémon", "Medieval", "Relaxed", "Boss Battle", "Tavern", "Space", "Horror", "Forest"];

export default function CategoryBar({ category, onSearch }: Props) {
  const [value, setValue] = useState(category);

  useEffect(() => {
    setValue(category);
  }, [category]);

  return (
    <div className="catbar">
      <form
        className="catbar__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSearch(value.trim());
        }}
      >
        <span className="catbar__icon">🔎</span>
        <input
          className="catbar__input"
          placeholder="Search a vibe — pokemon, medieval, relaxed…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Category"
        />
        <button className="catbar__go" type="submit" disabled={!value.trim()}>
          Go
        </button>
      </form>
      <div className="catbar__presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            className={`preset ${p.toLowerCase() === category.toLowerCase() ? "preset--active" : ""}`}
            onClick={() => onSearch(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
