import React from "react";
import * as AppStaticData from "../music/appStaticData.js";
const { UI_SECTION_PANEL } = AppStaticData;

const PanelBlock = React.forwardRef(function PanelBlock({
  as = "section",
  level = "section",
  title,
  description = null,
  titleTooltip = "",
  headerAside = null,
  disabledHeader = false,
  collapsed = false,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  children,
  ...rest
}, ref) {
  const Tag = as;
  const headerStyle = {
    backgroundColor: disabledHeader
      ? "#f0f0f0"
      : level === "subsection"
        ? "var(--subsection-header-bg, #ebf2fa)"
      : "var(--section-header-bg, #c7d8e5)",
  };
  const headerSizeClass = level === "section" ? "min-h-[48px] items-center" : "min-h-[42px] items-center";

  return (
    <Tag ref={ref} className={`${UI_SECTION_PANEL} ${className}`.trim()} {...rest}>
      <div
        className={`flex flex-wrap ${headerSizeClass} justify-between gap-2 border-b border-slate-200 px-3 py-2 ${headerClassName}`.trim()}
        style={headerStyle}
      >
        <div className="min-w-0 flex-1">
          {title ? <div className={`${level === "section" ? "text-base" : "text-sm"} font-semibold text-slate-800`} title={titleTooltip || undefined}>{title}</div> : null}
          {description ? <div className="mt-0.5 text-xs text-slate-600">{description}</div> : null}
        </div>
        {headerAside ? <div className="min-w-0 shrink-0">{headerAside}</div> : null}
      </div>
      {!collapsed && <div className={`bg-white p-3 ${bodyClassName}`.trim()}>{children}</div>}
    </Tag>
  );
});

export default PanelBlock;
