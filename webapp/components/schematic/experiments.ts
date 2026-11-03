export const schematicExperiments = [
  { slug: "1", label: "schematic/1" },
  { slug: "2", label: "schematic/2" },
  { slug: "3", label: "schematic/3" },
] as const;

export type SchematicExperimentSlug = (typeof schematicExperiments)[number]["slug"];

export function isSchematicExperimentSlug(value: string): value is SchematicExperimentSlug {
  return schematicExperiments.some((experiment) => experiment.slug === value);
}
