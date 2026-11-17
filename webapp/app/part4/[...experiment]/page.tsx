import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPart4Page, findPart4Version, part4Versions } from "@/components/part4/versions";

export const dynamicParams = false;

// The version path leads the title so open tabs read "v0/phones · …" first.
export async function generateMetadata({ params }: { params: Promise<{ experiment: string[] }> }): Promise<Metadata> {
  const { experiment: path } = await params;
  return { title: `${path.join("/")} · part4` };
}

export function generateStaticParams() {
  return part4Versions.flatMap((version) => [
    { experiment: [version.key] },
    ...version.interfaces.map((entry) => ({ experiment: [version.key, entry.key] })),
  ]);
}

export default async function Part4ExperimentPage({ params }: { params: Promise<{ experiment: string[] }> }) {
  const { experiment: path } = await params;
  if (path.length > 2) notFound();

  const version = findPart4Version(path[0]!);
  if (!version) notFound();

  const page = path.length === 1 ? version : findPart4Page(version, path[1]!);
  if (!page) notFound();

  const { default: Component } = await page.load();
  return <Component />;
}
