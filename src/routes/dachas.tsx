import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dachas")({
  beforeLoad: () => {
    throw redirect({ to: "/hotels" });
  },
});
