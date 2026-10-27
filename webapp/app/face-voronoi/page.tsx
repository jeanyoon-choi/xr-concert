import type { Metadata } from "next";
import ExperimentNavigation from "@/components/navigation";
import { getNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = { title: "face-voronoi" };

export default function FaceVoronoiIndexPage() {
  return <ExperimentNavigation experiments={getNavigationItems("face-voronoi")} scope="face-voronoi" />;
}
