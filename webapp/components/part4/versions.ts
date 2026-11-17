import { part4V0 } from "./v0/version";

// Thin index only. Each version directory owns all of its own code.
export const part4Versions = [part4V0] as const;

export type Part4Version = (typeof part4Versions)[number];

export function findPart4Version(key: string) {
  return part4Versions.find((version) => version.key === key);
}

export function findPart4Page(version: Part4Version, key: string) {
  return version.interfaces.find((entry) => entry.key === key);
}
