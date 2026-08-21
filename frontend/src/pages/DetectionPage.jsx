import React from "react";
import { useParams, Navigate } from "react-router-dom";
import MastitisDetectionPage from "./MastitisDetectionPage";
import FMDDetectionPage from "./FMDDetectionPage";
import LSDDetectionPage from "./LSDDetectionPage";
import MilkFeverDetectionPage from "./MilkFeverDetectionPage";

/**
 * DetectionPage - Dynamic Router & Dispatcher for Disease Detection
 * Route: /detect/:moduleKey  (mastitis | fmd | lumpy | lsd | milk-fever)
 */
export default function DetectionPage() {
  const { moduleKey } = useParams();

  switch (moduleKey?.toLowerCase()) {
    case "mastitis":
      return <MastitisDetectionPage />;
    case "fmd":
      return <FMDDetectionPage />;
    case "lumpy":
    case "lsd":
      return <LSDDetectionPage />;
    case "milk-fever":
    case "milkfever":
      return <MilkFeverDetectionPage />;
    default:
      return <Navigate to="/modules" replace />;
  }
}
