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
  return { title: `NRF XR mobile ${experiment}` };
}

export default async function ConcertMobilePage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isConcertExperimentSlug(experiment)) notFound();
  const Mobile = getConcertExperiment(experiment).Mobile;
  return <Mobile />;
}
