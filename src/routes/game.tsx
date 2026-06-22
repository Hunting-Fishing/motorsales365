import { createFileRoute, redirect } from "@tanstack/react-router";

// Singular alias — redirect /game to /games
export const Route = createFileRoute("/game")({
  beforeLoad: () => {
    throw redirect({ to: "/games" });
  },
});
