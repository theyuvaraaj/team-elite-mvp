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
    <BrandWordmark className={className} surface={surface} />
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
  const sealClass =
    surface === "on-dark"
      ? "fill-[#ece2cd]"
      : surface === "on-light"
        ? "fill-[#211d16]"
        : "fill-[#211d16] dark:fill-[#ece2cd]";
  const letterClass =
    surface === "on-dark"
      ? "fill-[#17130d]"
      : surface === "on-light"
        ? "fill-[#faf6ec]"
        : "fill-[#faf6ec] dark:fill-[#17130d]";

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect className={sealClass} x="0" y="0" width="64" height="64" rx="8" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        className={letterClass}
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "21px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        TE
      </text>
    </svg>
  );
}

/** Typographic lockup: ink seal + wordmark, styled for the ledger world. */
export function BrandWordmark({
  className = "",
  surface = "auto",
}: {
  className?: string;
  surface?: Surface;
}) {
  const wordClass =
    surface === "on-dark"
      ? "text-[#ece2cd]"
      : surface === "on-light"
        ? "text-[#211d16]"
        : "text-foreground";
  const subClass =
    surface === "on-dark"
      ? "text-[#ece2cd]/55"
      : surface === "on-light"
        ? "text-[#6f6552]"
        : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="size-9" surface={surface} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[17px] tracking-[-0.02em] ${wordClass}`}
        >
          Team&nbsp;Elite
        </span>
        <span
          className={`mt-1 font-mono text-[9.5px] uppercase tracking-[0.22em] ${subClass}`}
        >
          Portal
        </span>
      </span>
    </span>
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
