import { Home, SearchX } from "lucide-react";

import { StatusPage } from "@/components/shared/status-page";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="Lost in the Forge"
      title="This path drifted out of the Forge."
      description="Whatever lived here isn't connected anymore. The page may have moved, disappeared, or the route may never have existed."
      icon={SearchX}
      primaryAction={{
        label: "Return to the Forge",
        href: "/",
        icon: Home,
      }}
    />
  );
}
