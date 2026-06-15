import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { fetchSalesChart, type SalesChartPeriod } from "@/lib/api/client";
import { formatTzs } from "@/lib/currency";
import { useBranchReload } from "@/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const PERIODS: { id: SalesChartPeriod; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "12m", label: "12 months" },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
};

export function SalesChart() {
  const [period, setPeriod] = useState<SalesChartPeriod>("30d");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [rangeLabel, setRangeLabel] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [points, setPoints] = useState<{ label: string; revenue: number }[]>([]);

  const load = async (p: SalesChartPeriod) => {
    setLoading(true);
    try {
      const data = await fetchSalesChart(p);
      setTitle(data.title);
      setRangeLabel(data.range_label);
      setTotalRevenue(data.total_revenue);
      setPoints(data.points.map((pt) => ({ label: pt.label, revenue: pt.revenue })));
    } catch {
      setPoints([]);
      setTotalRevenue(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(period);
  }, [period]);

  useBranchReload(() => load(period));

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Sales overview</h2>
          <p className="text-sm text-muted-foreground">
            {rangeLabel || "Revenue for the selected period"}
          </p>
          {!loading && (
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              {formatTzs(totalRevenue)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={period === p.id ? "default" : "outline"}
              className={period === p.id ? "bg-gradient-primary" : ""}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No sales data for {title.toLowerCase()}.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={period === "30d" ? 4 : period === "12m" ? 1 : 0}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                fontSize={11}
                tickFormatter={(v) =>
                  Number(v) >= 1_000_000
                    ? `${Math.round(Number(v) / 1_000_000)}M`
                    : Number(v) >= 1_000
                      ? `${Math.round(Number(v) / 1_000)}k`
                      : String(v)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatTzs(Number(value))}
                    labelFormatter={(label) => String(label)}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
