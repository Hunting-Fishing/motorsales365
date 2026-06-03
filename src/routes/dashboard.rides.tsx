import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { publishRide, deleteRide } from "@/lib/rides.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rides")({
  component: MyRidesPage,
});

function MyRidesPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const publish = useServerFn(publishRide);
  const removeRide = useServerFn(deleteRide);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("rides")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRides(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [user?.id]);

  const toggle = async (id: string, currentlyPublished: boolean) => {
    try {
      await publish({ data: { id, publish: !currentlyPublished } });
      toast.success(currentlyPublished ? "Unpublished" : "Published");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeRide({ data: { id } });
      setRides((prev) => prev.filter((x) => x.id !== id));
      toast.success("Ride deleted");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Rides</h1>
          <p className="text-sm text-muted-foreground">
            Showcase your builds with specs, mods and service history.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/rides/new">
            <Plus className="mr-1 h-4 w-4" />
            Add a ride
          </Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <h2 className="font-display text-lg font-semibold">No rides yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first ride to share with the community.
          </p>
          <Button asChild className="mt-4">
            <Link to="/dashboard/rides/new">Add a ride</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rides.map((r) => (
            <div key={r.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-secondary">
                {r.cover_photo_url && (
                  <img src={r.cover_photo_url} alt={`${r.name} cover photo`} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{r.name}</h3>
                  <Badge
                    variant={r.status === "published" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[r.year, r.make, r.model].filter(Boolean).join(" ") || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard/rides/$id/edit" params={{ id: r.id }}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggle(r.id, r.status === "published")}
                  >
                    {r.status === "published" ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        Publish
                      </>
                    )}
                  </Button>
                  {r.status === "published" && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/rides/$slug" params={{ slug: r.slug }}>
                        View
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
