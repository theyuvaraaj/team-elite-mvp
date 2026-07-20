import { Link } from "react-router-dom";

type Surface = "auto" | "on-dark" | "on-light";

type BrandLogoProps = {
  to?: string | null;
  /** Mark only — no wordmark */
  compact?: boolean;
  surface?: Surface;
  className?: string;
};

/** Official Team Elite lockup. */
export function BrandLogo({
  to = "/",
  compact = false,
  surface = "auto",
  className = "",
}: BrandLogoProps) {
  const content = compact ? (
    <BrandMark className={`size-9 sm:size-10 ${className}`} surface={surface} />
  ) : (
    <BrandLockupImage className={className} surface={surface} />
  );

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Team Elite Portal"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function BrandMark({
  className = "size-10",
  surface = "auto",
}: {
  className?: string;
  surface?: Surface;
}) {
  const discClass =
    surface === "on-dark"
      ? "fill-[#F3F0E8]"
      : surface === "on-light"
        ? "fill-[#0B3022]"
        : "fill-[#0B3022] dark:fill-[#F3F0E8]";
  const letterClass =
    surface === "on-dark"
      ? "fill-[#0B3022]"
      : surface === "on-light"
        ? "fill-white"
        : "fill-white dark:fill-[#0B3022]";

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle className={discClass} cx="32" cy="32" r="32" />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        className={letterClass}
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "-0.06em",
        }}
      >
        TE
      </text>
    </svg>
  );
}

export function BrandLockupImage({
  className = "",
  surface = "auto",
}: {
  className?: string;
  surface?: Surface;
}) {
  const base = `h-9 w-auto max-w-[min(100%,260px)] object-contain object-left sm:h-10 ${className}`;

  if (surface === "on-dark") {
    return <img src="/brand/logo-dark.png" alt="Team Elite" className={base} />;
  }
  if (surface === "on-light") {
    return <img src="/brand/logo-light.png" alt="Team Elite" className={base} />;
  }
  return (
    <>
      <img
        src="/brand/logo-light.png"
        alt="Team Elite"
        className={`dark:hidden ${base}`}
      />
      <img
        src="/brand/logo-dark.png"
        alt="Team Elite"
        className={`hidden dark:block ${base}`}
      />
    </>
  );
}
