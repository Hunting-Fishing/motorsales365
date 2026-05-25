import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrgs } from "@/lib/leads.functions";

export const Route = createFileRoute("/dashboard/team/")({
  component: TeamIndex,
});

function TeamIndex() {
  const fetchOrgs = useServerFn(listMyOrgs);
  const { data, isLoading } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => fetchOrgs(),
  });
  if (isLoading) return null;
  if (!data || data.length === 0) return null;
  return <Navigate to="/dashboard/team/leads" search={{ orgId: data[0].id } as any} />;
}
