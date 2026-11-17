import type { Metadata } from "next";
import ExperimentNavigation from "@/components/navigation";
import { getNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = { title: "part4" };

export default function Part4IndexPage() {
  return <ExperimentNavigation experiments={getNavigationItems("part4")} scope="part4" />;
}
