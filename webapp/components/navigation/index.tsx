"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { navigationAreas, type NavigationArea } from "./areas";
import type { NavigationItem } from "./experiments";
import styles from "./navigation.module.css";
import { ThemeToggle, useNavigationTheme } from "./theme";

// Port of the experiments-jyc SCC catalogue: date/group views, search,
// keyboard movement, and rows that open each experiment in a new tab.

type NavigationView = "date" | "group";

type NavigationProps = {
  experiments: readonly NavigationItem[];
  /** Area shown in the breadcrumb; its prefix is removed from row names. */
  scope: NavigationArea;
};

type ExperimentGroup = {
  key: string;
  label: string;
  experiments: NavigationItem[];
};

const naturalOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const views: readonly NavigationView[] = ["date", "group"];

function getDateLabel(date: string) {
  return date.replaceAll("-", ".");
}

function getExperimentName(key: string, prefix: string) {
  return key.startsWith(`${prefix}/`) ? key.slice(prefix.length + 1) : key;
}

function withView(href: string, view: NavigationView) {
  return view === "date" ? href : `${href}?view=${view}`;
}

function byKey(first: NavigationItem, second: NavigationItem) {
  return naturalOrder.compare(first.key, second.key);
}

function groupBy(
  experiments: NavigationItem[],
  field: "date" | "family",
): ExperimentGroup[] {
  const values = Array.from(new Set(experiments.map((experiment) => experiment[field])));
  values.sort((first, second) =>
    field === "date" ? second.localeCompare(first) : naturalOrder.compare(second, first),
  );

  return values.map((value) => ({
    key: `${field}:${value}`,
    label: field === "date" ? getDateLabel(value) : value,
    experiments: experiments.filter((experiment) => experiment[field] === value).sort(byKey),
  }));
}

function GroupHeader({
  label,
  count,
  isCollapsed,
  onToggle,
}: {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" aria-expanded={!isCollapsed} onClick={onToggle} className={styles.groupHeader}>
      <span aria-hidden="true" className={styles.caret}>
        {isCollapsed ? "▶" : "▼"}
      </span>
      <span>{label}</span>
      <span className={styles.count}>{count}</span>
    </button>
  );
}

function ExperimentRow({
  experiment,
  name,
  underDate,
}: {
  experiment: NavigationItem;
  name: string;
  /** Inside a date group the row's own date repeats the heading. */
  underDate: boolean;
}) {
  const href = `/${experiment.key}`;

  return (
    <div className={`${styles.row} ${underDate ? styles.rowUnderDate : ""}`}>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        data-nrf-experiment
        className={styles.rowName}
      >
        {name}
      </Link>
      <span className={styles.rowPhrase}>{experiment.phrase}</span>
      <time
        dateTime={experiment.date}
        title={experiment.created ? `created ${getDateLabel(experiment.created)}` : undefined}
        className={styles.rowDate}
      >
        {getDateLabel(experiment.date)}
      </time>
      <span className={styles.rowPath}>{href}</span>
      <span aria-hidden="true" className={styles.rowArrow}>
        →
      </span>
    </div>
  );
}

function NavigationScreen({
  experiments,
  scope,
  view,
  onViewChange,
}: NavigationProps & {
  view: NavigationView;
  onViewChange?: (view: NavigationView) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const theme = useNavigationTheme();
  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperiments = useMemo(() => {
    if (!normalizedQuery) return [...experiments];
    return experiments.filter((experiment) =>
      [
        experiment.key,
        experiment.family,
        experiment.phrase,
        experiment.date,
        getDateLabel(experiment.date),
        experiment.created ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [experiments, normalizedQuery]);

  const groups = useMemo(
    () => groupBy(filteredExperiments, view === "date" ? "date" : "family"),
    [filteredExperiments, view],
  );

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === "v" && !isEditing && onViewChange) {
        event.preventDefault();
        onViewChange(view === "date" ? "group" : "date");
        return;
      }

      if ((event.key === "j" || event.key === "k") && !isEditing) {
        const links = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("[data-nrf-experiment]"),
        );
        if (links.length === 0) return;

        event.preventDefault();
        const activeIndex = links.findIndex((link) => link === document.activeElement);
        const direction = event.key === "j" ? 1 : -1;
        const nextIndex =
          activeIndex === -1
            ? direction === 1
              ? 0
              : links.length - 1
            : (activeIndex + direction + links.length) % links.length;
        links[nextIndex]?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [onViewChange, view]);

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  function isCollapsed(groupKey: string) {
    return !normalizedQuery && collapsedGroups.has(groupKey);
  }

  return (
    <main
      data-nrf-navigation
      data-theme={theme === "system" ? undefined : theme}
      className={styles.root}
    >
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{scope}</h1>
          <label className={styles.search}>
            <span className={styles.srOnly}>Search experiments</span>
            <span aria-hidden="true" className={styles.searchSlash}>
              /
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                setQuery("");
                event.currentTarget.blur();
              }}
              placeholder={`Search ${scope} experiments`}
              autoComplete="off"
              className={styles.searchInput}
            />
          </label>
          <div className={styles.tools}>
            <ThemeToggle />
            <div role="group" aria-label="View" className={styles.segmented}>
              {views.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => onViewChange?.(option)}
                  className={styles.segment}
                >
                  {option}
                </button>
              ))}
            </div>
            <span className={styles.toolCount}>{filteredExperiments.length} experiments</span>
            <span className={styles.toolKeys}>J/K move · Enter open · V view · Esc clear</span>
          </div>
        </div>
        <nav aria-label="Areas" className={styles.areas}>
          {navigationAreas.map((area) => (
            <Link
              key={area.key}
              href={withView(area.href, view)}
              aria-current={area.key === scope ? "page" : undefined}
              className={styles.areaLink}
            >
              {area.key}
            </Link>
          ))}
        </nav>
      </header>

      <nav aria-label={`${scope} experiments`} className={styles.list}>
        <div aria-hidden="true" className={styles.columns}>
          <span>Name</span>
          <span>Description</span>
          <span>Created</span>
          <span>Path</span>
          <span />
        </div>

        {groups.map((group) => (
          <section key={group.key} className={styles.group}>
            <GroupHeader
              label={view === "group" ? getExperimentName(group.label, scope) || group.label : group.label}
              count={group.experiments.length}
              isCollapsed={isCollapsed(group.key)}
              onToggle={() => toggleGroup(group.key)}
            />
            {!isCollapsed(group.key)
              ? group.experiments.map((experiment) => (
                  <ExperimentRow
                    key={experiment.key}
                    experiment={experiment}
                    name={getExperimentName(experiment.key, scope)}
                    underDate={view === "date"}
                  />
                ))
              : null}
          </section>
        ))}

        {filteredExperiments.length === 0 ? (
          <p className={styles.empty}>No experiments match “{query}”.</p>
        ) : null}
      </nav>
    </main>
  );
}

function NavigationWithViewParam(props: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: NavigationView = searchParams.get("view") === "group" ? "group" : "date";

  function changeView(next: NavigationView) {
    if (next === view) return;
    router.push(withView(pathname, next), { scroll: false });
  }

  return <NavigationScreen {...props} view={view} onViewChange={changeView} />;
}

export default function ExperimentNavigation(props: NavigationProps) {
  // The view lives in `?view=`; prerendered HTML shows the date view until
  // search params are read on the client.
  return (
    <Suspense fallback={<NavigationScreen {...props} view="date" />}>
      <NavigationWithViewParam {...props} />
    </Suspense>
  );
}
