import { parametricInterfaceV0 } from "./v0/version";
import { parametricInterfaceV1 } from "./v1/version";
import { parametricInterfaceV2 } from "./v2/version";
import { parametricInterfaceV3 } from "./v3/version";
import { parametricInterfaceV4 } from "./v4/version";

// Thin index only. Each version directory owns all of its own code.
export const parametricInterfaceVersions = [
  parametricInterfaceV0,
  parametricInterfaceV1,
  parametricInterfaceV2,
  parametricInterfaceV3,
  parametricInterfaceV4,
] as const;

export type ParametricInterfaceVersion = (typeof parametricInterfaceVersions)[number];

export function findParametricInterfaceVersion(key: string) {
  return parametricInterfaceVersions.find((version) => version.key === key);
}

export function findParametricInterface(version: ParametricInterfaceVersion, key: string) {
  return version.interfaces.find((entry) => entry.key === key);
}
