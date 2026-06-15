const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

const ACCESS_KEY = "pharmacy_access_token";
const REFRESH_KEY = "pharmacy_refresh_token";
const BRANCH_KEY = "pharmacy_active_branch";

export type MeResponse = {
  id: number;
  email: string;
  is_superuser?: boolean;
  is_platform_admin?: boolean;
  profile: {
    id: number;
    full_name: string;
    username: string;
    email: string;
  };
  roles: string[];
  pharmacy?: PharmacyBrief | null;
  branches: Branch[];
  default_branch_id: string | null;
};

export type PharmacyBrief = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  access_status: "pending" | "active" | "suspended";
  has_system_access: boolean;
};

export type PharmacyRecord = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  access_status: "pending" | "active" | "suspended";
  payment_notes: string;
  access_granted_at: string | null;
  is_active: boolean;
  manager: {
    id: number;
    full_name: string;
    username: string;
    email: string;
  };
  branch_count: number;
  branches: Branch[];
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  user: MeResponse;
  tokens: { access: string; refresh: string };
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearActiveBranchId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BRANCH_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(BRANCH_KEY);
}

export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BRANCH_KEY);
}

export function setActiveBranchId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRANCH_KEY, id);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function withBranch(path: string): string {
  const branchId = getActiveBranchId();
  if (!branchId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}branch=${encodeURIComponent(branchId)}`;
}

export type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  pharmacist_count: number;
  created_at: string;
  updated_at: string;
};

export type BranchMember = {
  id: string;
  user_id: number;
  full_name: string;
  email: string;
  roles: string[];
  is_manager: boolean;
  created_at: string;
};

export async function fetchBranches(): Promise<Branch[]> {
  const data = await apiFetch<Paginated<Branch> | Branch[]>("/branches/");
  return unwrapList(data);
}

export async function createBranch(payload: {
  name: string;
  address?: string;
  phone?: string;
}): Promise<Branch> {
  return apiFetch<Branch>("/branches/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(
  id: string,
  payload: Partial<Pick<Branch, "name" | "address" | "phone" | "is_active">>,
): Promise<Branch> {
  return apiFetch<Branch>(`/branches/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchBranchMembers(branchId: string): Promise<BranchMember[]> {
  return apiFetch<BranchMember[]>(`/branches/${branchId}/members/`);
}

export async function assignBranchMember(
  branchId: string,
  userId: number,
  isManager = false,
): Promise<BranchMember> {
  return apiFetch<BranchMember>(`/branches/${branchId}/members/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, is_manager: isManager }),
  });
}

export async function removeBranchMember(branchId: string, userId: number): Promise<void> {
  await apiFetch(`/branches/${branchId}/members/${userId}/`, { method: "DELETE" });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Cannot reach the API at " + API_BASE + ". " +
      "Start Django: cd backend && python manage.py runserver. " +
      "Open the app at http://localhost:8080 (not the network IP).",
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const record = data as Record<string, unknown>;
    let message = "Request failed";
    if (typeof record.detail === "string") {
      message = record.detail;
    } else if (typeof record === "object" && record !== null) {
      for (const [key, value] of Object.entries(record)) {
        if (Array.isArray(value) && value[0]) {
          message = `${key}: ${String(value[0])}`;
          break;
        }
        if (typeof value === "string") {
          message = value;
          break;
        }
      }
    }
    throw new ApiError(message, res.status);
  }

  return data as T;
}

type Paginated<T> = { results: T[] };

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export type Drug = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiry_date: string | null;
  supplier: string | null;
};

export type Sale = {
  id: string;
  batch_id: string | null;
  drug_id: string;
  drug_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  sold_by: number;
  sold_at: string;
};

export type UserRow = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  roles: string[];
};

export type DashboardStats = {
  total_drugs: number;
  low_stock: number;
  expiring_soon: number;
  sales_today: number;
};

export type PlatformDashboardStats = {
  is_platform_admin: boolean;
  pharmacy_count: number;
  active_pharmacies: number;
  pending_pharmacies: number;
  suspended_pharmacies: number;
  manager_count: number;
  branch_count: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats | PlatformDashboardStats> {
  return apiFetch<DashboardStats | PlatformDashboardStats>(withBranch("/dashboard/stats/"));
}

export async function fetchPharmacies(): Promise<PharmacyRecord[]> {
  const data = await apiFetch<Paginated<PharmacyRecord> | PharmacyRecord[]>("/pharmacies/");
  return unwrapList(data);
}

export type RegisterPharmacyPayload = {
  pharmacy_name: string;
  logo?: File | null;
  address?: string;
  phone?: string;
  manager_email: string;
  manager_password: string;
  manager_full_name: string;
  manager_username: string;
};

export async function registerPharmacy(payload: RegisterPharmacyPayload): Promise<PharmacyRecord> {
  const form = new FormData();
  form.append("pharmacy_name", payload.pharmacy_name);
  if (payload.logo) form.append("logo", payload.logo);
  if (payload.address) form.append("address", payload.address);
  if (payload.phone) form.append("phone", payload.phone);
  form.append("manager_email", payload.manager_email);
  form.append("manager_password", payload.manager_password);
  form.append("manager_full_name", payload.manager_full_name);
  form.append("manager_username", payload.manager_username);
  return apiFetch<PharmacyRecord>("/pharmacies/", { method: "POST", body: form });
}

export async function updatePharmacyAccess(
  pharmacyId: string,
  payload: { access_status: "pending" | "active" | "suspended"; payment_notes?: string },
): Promise<PharmacyRecord> {
  return apiFetch<PharmacyRecord>(`/pharmacies/${pharmacyId}/access/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resetPharmacyManagerPassword(
  pharmacyId: string,
  new_password: string,
): Promise<void> {
  await apiFetch(`/pharmacies/${pharmacyId}/manager-password/`, {
    method: "PATCH",
    body: JSON.stringify({ new_password }),
  });
}

export type SalesChartPeriod = "7d" | "30d" | "12m";

export type SalesChart = {
  period: SalesChartPeriod;
  title: string;
  range_label: string;
  total_revenue: number;
  points: { label: string; date: string; revenue: number }[];
};

export async function fetchSalesChart(period: SalesChartPeriod = "30d"): Promise<SalesChart> {
  const params = new URLSearchParams({ period });
  return apiFetch<SalesChart>(withBranch(`/dashboard/sales-chart/?${params.toString()}`));
}

export async function fetchLowStockDrugs(): Promise<Drug[]> {
  const data = await apiFetch<Paginated<Drug> | Drug[]>(withBranch("/drugs/low-stock/"));
  return unwrapList(data);
}

export type StockOrder = {
  id: string;
  drug_id?: string;
  drug_name: string;
  quantity_requested: number;
  quantity_imported: number | null;
  stock_at_request: number;
  status: "pending" | "fulfilled" | "received" | "cancelled";
  notes: string;
  requested_by: number | null;
  requester_name: string;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchStockOrders(): Promise<StockOrder[]> {
  const data = await apiFetch<Paginated<StockOrder> | StockOrder[]>(withBranch("/stock-orders/"));
  return unwrapList(data);
}

export async function createStockOrder(payload: {
  product_id: string;
  quantity_requested: number;
  notes?: string;
}): Promise<StockOrder> {
  const branchId = getActiveBranchId();
  if (!branchId) throw new Error("Select a branch first.");
  return apiFetch<StockOrder>(withBranch("/stock-orders/"), {
    method: "POST",
    body: JSON.stringify({ ...payload, branch_id: branchId }),
  });
}

export async function updateStockOrderStatus(
  id: string,
  status: "fulfilled" | "cancelled",
): Promise<StockOrder> {
  return apiFetch<StockOrder>(withBranch(`/stock-orders/${id}/`), {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function recordStockImport(
  id: string,
  quantity_imported: number,
): Promise<StockOrder> {
  return apiFetch<StockOrder>(withBranch(`/stock-orders/${id}/`), {
    method: "PATCH",
    body: JSON.stringify({ quantity_imported }),
  });
}

export type DirectStockImport = {
  id: string;
  drug_name: string;
  quantity: number;
  notes: string;
  imported_by: number | null;
  importer_name: string;
  created_at: string;
};

export async function createDirectStockImport(payload: {
  product_id: string;
  quantity: number;
  notes?: string;
}): Promise<DirectStockImport> {
  const branchId = getActiveBranchId();
  if (!branchId) throw new Error("Select a branch first.");
  return apiFetch<DirectStockImport>(withBranch("/inventory/imports/"), {
    method: "POST",
    body: JSON.stringify({ ...payload, branch_id: branchId }),
  });
}

export async function fetchDrugs(): Promise<Drug[]> {
  const data = await apiFetch<Paginated<Drug> | Drug[]>(withBranch("/drugs/"));
  return unwrapList(data);
}

export async function fetchProducts(): Promise<Omit<Drug, "quantity">[]> {
  const data = await apiFetch<Paginated<Omit<Drug, "quantity">> | Omit<Drug, "quantity">[]>("/products/");
  return unwrapList(data);
}

export async function createDrug(payload: Partial<Drug>): Promise<Drug> {
  const created = await apiFetch<Omit<Drug, "quantity">>("/products/", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      category: payload.category ?? "General",
      price: payload.price ?? 0,
      expiry_date: payload.expiry_date ?? null,
      supplier: payload.supplier ?? null,
    }),
  });
  return { ...created, quantity: 0 };
}

export async function updateDrug(id: string, payload: Partial<Drug>): Promise<Drug> {
  const updated = await apiFetch<Omit<Drug, "quantity">>(`/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name,
      category: payload.category,
      price: payload.price,
      expiry_date: payload.expiry_date,
      supplier: payload.supplier,
    }),
  });
  return { ...updated, quantity: payload.quantity ?? 0 };
}

export async function deleteDrug(id: string): Promise<void> {
  await apiFetch(`/products/${id}/`, { method: "DELETE" });
}

export async function fetchDrugsInStock(): Promise<Pick<Drug, "id" | "name" | "price" | "quantity">[]> {
  const data = await apiFetch<Paginated<Pick<Drug, "id" | "name" | "price" | "quantity">> | Pick<Drug, "id" | "name" | "price" | "quantity">[]>(withBranch("/drugs/in-stock/"));
  return unwrapList(data);
}

export async function fetchSales(): Promise<Sale[]> {
  const data = await apiFetch<Paginated<Sale> | Sale[]>(withBranch("/sales/"));
  return unwrapList(data);
}

export type SalesReportPeriod = "daily" | "weekly" | "monthly" | "annual";

export type SalesReport = {
  period: SalesReportPeriod;
  title: string;
  report_date: string;
  range_label: string;
  branch_name: string;
  start: string;
  end: string;
  generated_at: string;
  total_revenue: number;
  total_items: number;
  transaction_count: number;
  sales: {
    id: string;
    batch_id: string | null;
    drug_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    sold_at: string;
  }[];
  by_product: {
    drug_name: string;
    quantity: number;
    revenue: number;
  }[];
};

export async function fetchSalesReport(
  period: SalesReportPeriod,
  date: string,
): Promise<SalesReport> {
  const params = new URLSearchParams({ period, date });
  return apiFetch<SalesReport>(withBranch(`/sales/report/?${params.toString()}`));
}

export async function createSale(product_id: string, quantity: number): Promise<Sale> {
  const branchId = getActiveBranchId();
  if (!branchId) throw new Error("Select a branch first.");
  return apiFetch<Sale>(withBranch("/sales/"), {
    method: "POST",
    body: JSON.stringify({ product_id, drug_id: product_id, quantity, branch_id: branchId }),
  });
}

export async function createSaleBatch(
  items: { product_id: string; quantity: number }[],
): Promise<Sale[]> {
  const branchId = getActiveBranchId();
  if (!branchId) throw new Error("Select a branch first.");
  return apiFetch<Sale[]>(withBranch("/sales/"), {
    method: "POST",
    body: JSON.stringify({
      items: items.map((item) => ({
        product_id: item.product_id,
        drug_id: item.product_id,
        quantity: item.quantity,
      })),
      branch_id: branchId,
    }),
  });
}

export async function fetchUsers(): Promise<UserRow[]> {
  const data = await apiFetch<Paginated<UserRow> | UserRow[]>("/users/");
  return unwrapList(data);
}

export type CreateUserPayload = {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role?: "pharmacist" | "store_manager";
  branch_id?: string;
};

export async function createUser(payload: CreateUserPayload): Promise<UserRow> {
  return apiFetch<UserRow>("/users/", {
    method: "POST",
    body: JSON.stringify({ role: "pharmacist", ...payload }),
  });
}

export async function setUserRole(userId: number, role: string): Promise<UserRow> {
  return apiFetch<UserRow>(`/users/${userId}/role/`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me/");
}

export async function updateProfile(payload: {
  full_name?: string;
  username?: string;
}): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  await apiFetch("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export async function logout(): Promise<void> {
  const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
  try {
    await apiFetch("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    });
  } catch {
    // ignore — tokens cleared client-side anyway
  } finally {
    clearTokens();
  }
}
