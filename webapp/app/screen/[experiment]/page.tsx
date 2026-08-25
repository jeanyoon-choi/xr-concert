import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  concertExperiments,
  getConcertExperiment,
  isConcertExperimentSlug,
} from "@/components/concert/experiments";

export function generateStaticParams() {
  return concertExperiments.map((experiment) => ({ experiment: experiment.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `NRF XR screen ${experiment}` };
}

export default async function ConcertScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isConcertExperimentSlug(experiment)) notFound();
  const Screen = getConcertExperiment(experiment).Screen;
  return <Screen />;
}
