import styles from "../google-maps.module.css";
import { ICON_VIEWBOX, ICONS, type IconName } from "./icons";

// google.com/maps desktop chrome, measured on the live page at a 1322 × 703
// viewport (2026-11-03): side rail, search box, area card, category chips,
// apps and account, map controls, Layers, wordmark and the bottom bar.
// Personal parts of the live page (search history, saved places, the
// account photo) are not reproduced.

const CHIPS: readonly { label: string; icon: IconName }[] = [
  { label: "Restaurants", icon: "restaurant" },
  { label: "Hotels", icon: "hotel" },
  { label: "Things to do", icon: "photo_camera" },
  { label: "Museums", icon: "museum" },
  { label: "Transit", icon: "train" },
  { label: "Pharmacies", icon: "local_pharmacy" },
];

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className ?? styles.icon} viewBox={ICON_VIEWBOX}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function SideRail() {
  return (
    <nav aria-label="Google Maps" className={styles.rail} data-map-chrome="rail">
      <span className={styles.railMenu}><Icon name="menu" /></span>
      <span className={styles.railItem} style={{ top: 68 }}>
        <Icon name="bookmark" />
        <span>Saved</span>
      </span>
      <span className={styles.railItem} data-disabled style={{ top: 148 }}>
        <Icon name="history" />
        <span>Recents</span>
      </span>
      <span className={styles.railItem} style={{ bottom: 20 }}>
        <Icon name="smartphone" />
        <span>Get app</span>
      </span>
    </nav>
  );
}

export function SearchPanel() {
  return (
    <div className={styles.searchColumn} data-map-chrome="search">
      <div className={styles.searchBox}>
        <span className={styles.searchPlaceholder}>Search Google Maps</span>
        <span className={styles.searchButton}><Icon name="search" /></span>
        <span className={styles.directionsButton}><Icon className={styles.directionsIcon} name="filled_directions" /></span>
      </div>
      <section className={styles.areaCard}>
        <h2>This area</h2>
        <div className={styles.areaRow}>
          <span className={styles.trafficBadge}><Icon name="filled_traffic" /></span>
          <span className={styles.areaText}>
            <strong>Moderate traffic in this area</strong>
            <span>Much slower than usual</span>
          </span>
          <Icon className={styles.areaChevron} name="chevron_right" />
        </div>
      </section>
    </div>
  );
}

export function CategoryChips() {
  return (
    <div className={styles.chipRow} data-map-chrome="chips">
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <span className={styles.chip} key={chip.label}>
            <Icon className={styles.chipIcon} name={chip.icon} />
            {chip.label}
          </span>
        ))}
      </div>
      <span className={styles.chipNext}><Icon className={styles.chipIcon} name="chevron_right" /></span>
    </div>
  );
}

export function AccountArea() {
  return (
    <div className={styles.account} data-map-chrome="account">
      <span className={styles.appsButton}><Icon name="apps" /></span>
      <span className={styles.avatar}>N</span>
    </div>
  );
}

export function MapControls() {
  return (
    <>
      <div className={styles.controls} data-map-chrome="controls">
        <span className={styles.locate}><Icon name="my_location" /></span>
        <span className={styles.zoom}>
          <Icon name="add" />
          <i />
          <Icon name="remove" />
        </span>
      </div>
      <div className={styles.imagery} data-map-chrome="imagery">
        <span className={styles.pegman}><Icon name="filled_person" /></span>
        <span className={styles.thumb} data-kind="globe" />
        <span className={styles.thumb} data-kind="terrain" />
        <span className={styles.thumb} data-kind="green" />
        <Icon className={styles.imageryMore} name="keyboard_double_arrow_up" />
      </div>
      <div className={styles.layers} data-map-chrome="layers">
        <span className={styles.layersLabel}><Icon name="layers" />Layers</span>
      </div>
      <span className={styles.wordmark} data-map-chrome="wordmark">Google Maps</span>
      <footer className={styles.bottomBar} data-map-chrome="bottom">
        <span>Map data © OpenStreetMap contributors, OpenFreeMap</span>
        <span>United States</span>
        <span>Terms</span>
        <span>Privacy</span>
        <span>Send Product Feedback</span>
        <span className={styles.scale}>200 m<i /></span>
      </footer>
    </>
  );
}
