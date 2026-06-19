import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ApiError,
  clearActiveBranchId,
  clearTokens,
  fetchMe,
  getAccessToken,
  getActiveBranchId,
  logout as apiLogout,
  setActiveBranchId,
  setTokens,
  type MeResponse,
} from "@/lib/api/client";

export type AppRole = "admin" | "pharmacist" | "store_manager";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  pharmacist: "Pharmacist",
  store_manager: "Manager",
};

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role as AppRole] ?? role.replace(/_/g, " ");
}

interface Profile {
  id: number;
  full_name: string;
  username: string;
  email: string;
}

interface AuthUser {
  id: number;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  roles: AppRole[];
  pharmacy: MeResponse["pharmacy"];
  isSuperuser: boolean;
  isPlatformAdmin: boolean;
  loading: boolean;
  hasRole: (r: AppRole) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setSession: (data: MeResponse, tokens: { access: string; refresh: string }) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyMe(
  data: MeResponse,
  setUser: (u: AuthUser | null) => void,
  setProfile: (p: Profile | null) => void,
  setRoles: (r: AppRole[]) => void,
  setPharmacy: (p: MeResponse["pharmacy"]) => void,
  setIsSuperuser: (v: boolean) => void,
  setIsPlatformAdmin: (v: boolean) => void,
) {
  setUser({ id: data.id, email: data.email });
  setProfile(data.profile);
  setRoles(data.roles as AppRole[]);
  setPharmacy(data.pharmacy ?? null);
  setIsSuperuser(Boolean(data.is_superuser));
  setIsPlatformAdmin(Boolean(data.is_platform_admin || data.roles.includes("admin")));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [pharmacy, setPharmacy] = useState<MeResponse["pharmacy"]>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getAccessToken()) {
      setUser(null);
      setProfile(null);
      setRoles([]);
      setPharmacy(null);
      setIsSuperuser(false);
      setIsPlatformAdmin(false);
      return;
    }
    const me = await fetchMe();
    applyMe(me, setUser, setProfile, setRoles, setPharmacy, setIsSuperuser, setIsPlatformAdmin);
    if (me.default_branch_id && !getActiveBranchId()) {
      setActiveBranchId(me.default_branch_id);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (getAccessToken()) await refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          setUser(null);
          setProfile(null);
          setRoles([]);
          setPharmacy(null);
          setIsSuperuser(false);
          setIsPlatformAdmin(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    roles,
    pharmacy,
    isSuperuser,
    isPlatformAdmin,
    loading,
    hasRole: (r) => isSuperuser || roles.includes(r),
    signOut: async () => {
      await apiLogout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      setPharmacy(null);
      setIsSuperuser(false);
      setIsPlatformAdmin(false);
    },
    refresh,
    setSession: (data, tokens) => {
      setTokens(tokens.access, tokens.refresh);
      applyMe(data, setUser, setProfile, setRoles, setPharmacy, setIsSuperuser, setIsPlatformAdmin);
      const admin = Boolean(data.is_platform_admin || data.roles.includes("admin"));
      if (admin) {
        clearActiveBranchId();
      } else if (data.default_branch_id) {
        setActiveBranchId(data.default_branch_id);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
