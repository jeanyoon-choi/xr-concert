import type { Metadata } from "next";
import ExperimentNavigation from "@/components/navigation";
import { getNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = { title: "schematic" };

export default function SchematicIndexPage() {
  return <ExperimentNavigation experiments={getNavigationItems("schematic")} scope="schematic" />;
}
