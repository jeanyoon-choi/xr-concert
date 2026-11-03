import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SchematicStudy1 from "@/components/schematic/1";
import SchematicStudy2 from "@/components/schematic/2";
import SchematicStudy3 from "@/components/schematic/3";
import { isSchematicExperimentSlug, schematicExperiments } from "@/components/schematic/experiments";

export function generateStaticParams() {
  return schematicExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `schematic/${experiment}`,
    description: "The concert drawn as one circuit: where sound leaves devices and where signal travels.",
  };
}

export default async function SchematicExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isSchematicExperimentSlug(experiment)) notFound();
  if (experiment === "3") return <SchematicStudy3 />;
  return experiment === "2" ? <SchematicStudy2 /> : <SchematicStudy1 />;
}
