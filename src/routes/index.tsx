import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}
