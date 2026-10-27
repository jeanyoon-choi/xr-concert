import type { Metadata } from "next";
import ExperimentNavigation from "@/components/navigation";
import { getNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = { title: "parametric-interface" };

export default function ParametricInterfaceIndexPage() {
  return <ExperimentNavigation experiments={getNavigationItems("parametric-interface")} scope="parametric-interface" />;
}
