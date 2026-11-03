import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  findParametricInterface,
  findParametricInterfaceVersion,
  parametricInterfaceVersions,
} from "@/components/parametric-interface/versions";

export const dynamicParams = false;

// Pre-version paths (the U2 song) now live under v0.
const legacyRedirects: Readonly<Record<string, string>> = {
  whole: "/parametric-interface/v0",
  ...Object.fromEntries(
    ["1", "2", "3", "4", "5", "6"].map((key) => [key, `/parametric-interface/v0/${key}`]),
  ),
};

// The version path leads the title so open tabs read "v2/9 · …" first.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}): Promise<Metadata> {
  const { experiment: path } = await params;
  return { title: `${path.join("/")} · parametric-interface` };
}

export function generateStaticParams() {
  return [
    ...Object.keys(legacyRedirects).map((key) => ({ experiment: [key] })),
    ...parametricInterfaceVersions.flatMap((version) => [
      { experiment: [version.key] },
      ...version.interfaces.map((entry) => ({ experiment: [version.key, entry.key] })),
    ]),
  ];
}

export default async function ParametricInterfaceExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  if (path.length > 2) notFound();

  const legacyTarget = path.length === 1 ? legacyRedirects[path[0]!] : undefined;
  if (legacyTarget) permanentRedirect(legacyTarget);

  const version = findParametricInterfaceVersion(path[0]!);
  if (!version) notFound();

  const experiment = path.length === 1 ? version : findParametricInterface(version, path[1]!);
  if (!experiment) notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
