import { isDark } from "../../music/appMusicBasics.js";

const SIZE_CLASSES = {
  m:    "h-7 w-7 text-[10px]",
  pair: "h-[26px] w-[26px] text-[10px]",
  s:    "h-6 w-6 text-[9px]",
  cal:  "h-[21px] w-[21px] text-[8px]",
};

export default function FretNoteMarker({ color, ring, label, size = "m", title }) {
  const dark = isDark(color);
  return (
    <div
      className={`relative z-20 inline-flex items-center justify-center rounded-full font-bold ${SIZE_CLASSES[size] ?? SIZE_CLASSES.m}`}
      title={title}
    >
      <span
        className="absolute inset-0 z-[1] rounded-full"
        style={{ backgroundColor: color, border: `2px solid ${ring}`, boxSizing: "border-box" }}
      />
      <span className="relative z-[2]" style={{ color: dark ? "#fff" : "#0f172a" }}>
        {label}
      </span>
    </div>
  );
}
