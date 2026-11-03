"use client";

import { useState } from "react";
import {
  otherPeople,
  thisMac,
  trackedDevices,
  trackedPerson,
  type FindMyTab,
  type StaticListing,
} from "../model/people";
import { useTrackedPerson } from "../timeline/use-tracked-person";
import CityMap from "./city-map";
import styles from "./find-my.module.css";

const tabs: readonly { id: FindMyTab; label: string }[] = [
  { id: "people", label: "People" },
  { id: "devices", label: "Devices" },
  { id: "items", label: "Items" },
];

function ListingRow({
  detail,
  glyph,
  initials,
  name,
  selected,
  trailing,
}: {
  detail: string;
  glyph?: "laptop" | "phone" | "earbuds";
  initials: string;
  name: string;
  selected?: boolean;
  trailing: string | null;
}) {
  return (
    <li aria-selected={selected ?? false} className={styles.row} role="option">
      <span className={styles.avatar} data-glyph={glyph}>
        {glyph ? <DeviceGlyph kind={glyph} /> : initials}
      </span>
      <span className={styles.rowText}>
        <strong>{name}</strong>
        <span>{detail}</span>
      </span>
      {trailing ? <span className={styles.rowTrailing}>{trailing}</span> : null}
    </li>
  );
}

function DeviceGlyph({ kind }: { kind: "laptop" | "phone" | "earbuds" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {kind === "laptop" ? (
        <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V15H5zM3 16.5h18l-1 2H4z" />
      ) : kind === "phone" ? (
        <path d="M8.5 3h7A1.5 1.5 0 0 1 17 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5v-15A1.5 1.5 0 0 1 8.5 3zM10.5 4.6h3" />
      ) : (
        <path d="M7.5 5a3 3 0 0 1 3 3v3a2 2 0 0 1-2 2H8v5.5a1.5 1.5 0 0 1-3 0V8a3 3 0 0 1 2.5-3zM16.5 5a3 3 0 0 0-3 3v3a2 2 0 0 0 2 2h.5v5.5a1.5 1.5 0 0 0 3 0V8a3 3 0 0 0-2.5-3z" />
      )}
    </svg>
  );
}

function staticDetail(listing: StaticListing) {
  return listing.time ? `${listing.place} · ${listing.time}` : listing.place;
}

export default function FindMyWindow() {
  const [tab, setTab] = useState<FindMyTab>("people");
  const { activeWordPosition, camera, nearPlace, person, places, trail } = useTrackedPerson();
  const trackedDetail = `Near ${nearPlace} · Now`;

  return (
    <main className={styles.window}>
      <aside className={styles.sidebar}>
        <div className={styles.titlebar}>
          <span aria-hidden="true" className={styles.trafficLights}>
            <i data-light="close" />
            <i data-light="minimize" />
            <i data-light="zoom" />
          </span>
        </div>

        <div aria-label="Find My" className={styles.tabs} role="tablist">
          {tabs.map(({ id, label }) => (
            <button
              aria-selected={tab === id}
              className={styles.tab}
              key={id}
              onClick={() => setTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "people" ? (
          <ul aria-label="People" className={styles.list} role="listbox">
            <ListingRow
              detail={trackedDetail}
              initials={trackedPerson.initials}
              name={trackedPerson.name}
              selected
              trailing={null}
            />
            {otherPeople.map((listing) => (
              <ListingRow
                detail={staticDetail(listing)}
                initials={listing.initials}
                key={listing.id}
                name={listing.name}
                trailing={listing.distance}
              />
            ))}
          </ul>
        ) : tab === "devices" ? (
          <ul aria-label="Devices" className={styles.list} role="listbox">
            <ListingRow
              detail={thisMac.place}
              glyph="laptop"
              initials=""
              name={thisMac.name}
              trailing={null}
            />
            {trackedDevices.map((device, index) => (
              <ListingRow
                detail={trackedDetail}
                glyph={index === 0 ? "phone" : "earbuds"}
                initials=""
                key={device.id}
                name={device.name}
                selected={index === 0}
                trailing={null}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No Items</p>
        )}
      </aside>

      <CityMap
        activeWordPosition={activeWordPosition}
        camera={camera}
        person={person}
        places={places}
        trail={trail}
      />
    </main>
  );
}
