import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** Visual size of the trigger */
  size?: "sm" | "md";
  /** Hide the visible label (still sets aria-label) */
  labelHidden?: boolean;
  id?: string;
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  label,
  hint,
  disabled = false,
  className = "",
  size = "md",
  labelHidden = false,
  id,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    const selectedIndex = options.findIndex((option) => option.value === value);
    const next =
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : (enabled[0] ?? -1);
    setHighlight(next);
  }, [open, options, value]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const item = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function enabledIndexes() {
    return options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
  }

  function selectValue(next: string) {
    onChange(next);
    setOpen(false);
  }

  function moveHighlight(direction: 1 | -1) {
    const indexes = enabledIndexes();
    if (indexes.length === 0) return;
    const currentPos = indexes.indexOf(highlight);
    const fallback = direction === 1 ? -1 : 0;
    const pos = currentPos === -1 ? fallback : currentPos;
    const nextPos = (pos + direction + indexes.length) % indexes.length;
    setHighlight(indexes[nextPos]!);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[highlight];
      if (option && !option.disabled) selectValue(option.value);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(enabledIndexes()[0] ?? -1);
    } else if (event.key === "End") {
      event.preventDefault();
      const indexes = enabledIndexes();
      setHighlight(indexes[indexes.length - 1] ?? -1);
    }
  }

  const heightClass = size === "sm" ? "h-10 text-sm" : "h-11 text-[15px]";

  const trigger = (
    <button
      type="button"
      id={triggerId}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-label={labelHidden ? label : undefined}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={onTriggerKeyDown}
      className={`flex w-full items-center justify-between gap-3 rounded-[4px] border border-border bg-surface px-3.5 text-left outline-none transition hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/18 disabled:cursor-not-allowed disabled:opacity-55 ${heightClass} ${open ? "border-ring ring-4 ring-ring/18" : ""}`}
    >
      <span className="min-w-0 flex-1 truncate">
        {selected ? (
          <span className="text-foreground">{selected.label}</span>
        ) : (
          <span className="text-muted-foreground/70">{placeholder}</span>
        )}
      </span>
      <ChevronIcon open={open} />
    </button>
  );

  const menu = open ? (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={triggerId}
      aria-activedescendant={
        highlight >= 0 ? `${listboxId}-option-${highlight}` : undefined
      }
      onKeyDown={onListKeyDown}
      className="absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-[5px] border border-border bg-surface-elevated p-1.5 shadow-panel animate-rise"
    >
      {options.length === 0 ? (
        <li className="px-3 py-2.5 text-sm text-muted-foreground">No options</li>
      ) : (
        options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === highlight;
          return (
            <li
              key={`${option.value}-${index}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              data-index={index}
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              className={`flex cursor-pointer flex-col rounded-lg px-3 py-2.5 transition ${
                option.disabled
                  ? "cursor-not-allowed opacity-40"
                  : isActive
                    ? "bg-accent text-accent-foreground"
                    : isSelected
                      ? "bg-accent-soft text-foreground"
                      : "text-foreground hover:bg-muted"
              }`}
              onMouseEnter={() => {
                if (!option.disabled) setHighlight(index);
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                if (!option.disabled) selectValue(option.value);
              }}
            >
              <span className="truncate text-sm font-medium">{option.label}</span>
              {option.description ? (
                <span
                  className={`mt-0.5 truncate text-xs ${
                    isActive && !option.disabled
                      ? "text-accent-foreground/75"
                      : "text-muted-foreground"
                  }`}
                >
                  {option.description}
                </span>
              ) : null}
            </li>
          );
        })
      )}
    </ul>
  ) : null;

  const field: ReactNode = (
    <div ref={rootRef} className={`relative ${className}`}>
      {trigger}
      {menu}
    </div>
  );

  if (!label || labelHidden) {
    return field;
  }

  return (
    <div className="grid gap-2 text-sm font-medium text-foreground">
      <span className="flex items-center justify-between gap-3">
        <label htmlFor={triggerId}>{label}</label>
        {hint ? (
          <span className="font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {field}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
