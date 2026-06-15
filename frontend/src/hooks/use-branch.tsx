import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  fetchBranches,
  getActiveBranchId,
  setActiveBranchId,
  type Branch,
} from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";

interface BranchContextValue {
  branches: Branch[];
  activeBranch: Branch | null;
  activeBranchId: string | null;
  loading: boolean;
  setBranch: (id: string) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, isPlatformAdmin, loading: authLoading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(
    typeof window !== "undefined" ? getActiveBranchId() : null,
  );
  const [loading, setLoading] = useState(true);

  const refreshBranches = useCallback(async () => {
    if (!user || isPlatformAdmin) {
      setBranches([]);
      setActiveBranchIdState(null);
      return;
    }
    const list = await fetchBranches();
    setBranches(list);
    const stored = getActiveBranchId();
    const valid = list.find((b) => b.id === stored);
    if (valid) {
      setActiveBranchIdState(valid.id);
      return;
    }
    if (list.length > 0) {
      setActiveBranchId(list[0].id);
      setActiveBranchIdState(list[0].id);
    } else {
      setActiveBranchIdState(null);
    }
  }, [user, isPlatformAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBranches([]);
      setActiveBranchIdState(null);
      setLoading(false);
      return;
    }
    refreshBranches()
      .catch(() => {
        setBranches([]);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, refreshBranches]);

  const setBranch = (id: string) => {
    setActiveBranchId(id);
    setActiveBranchIdState(id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("branch-changed", { detail: id }));
    }
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  return (
    <BranchContext.Provider
      value={{ branches, activeBranch, activeBranchId, loading, setBranch, refreshBranches }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
}

export function useBranchReload(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener("branch-changed", handler);
    return () => window.removeEventListener("branch-changed", handler);
  }, [callback]);
}
