import PanelBlock from "../PanelBlock.jsx";

export default function StandardDetailPanel({ standard }) {
  return (
    <PanelBlock
      level="subsection"
      title={standard.title}
      description={standard.overview || undefined}
      bodyClassName="space-y-3"
    >
      {(Array.isArray(standard.composers) && standard.composers.length) || standard.year || standard.defaultKey ? (
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          {Array.isArray(standard.composers) && standard.composers.length ? (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              {standard.composers.join(" · ")}
            </span>
          ) : null}
          {standard.year ? (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              {standard.year}
            </span>
          ) : null}
          {standard.defaultKey ? (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              Tono: {standard.defaultKey}
            </span>
          ) : null}
        </div>
      ) : null}
    </PanelBlock>
  );
}
