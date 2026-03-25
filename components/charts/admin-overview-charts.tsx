"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface AdminOverviewChartsProps {
  identities: { state: string }[];
  groups: { name: string; memberCount: number }[];
}

const stateChartConfig = {
  active: { label: "Active", color: "hsl(var(--chart-2))" },
  inactive: { label: "Inactive", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const groupChartConfig = {
  memberCount: { label: "Members", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function AdminOverviewCharts({ identities, groups }: AdminOverviewChartsProps) {
  // State distribution for donut
  const stateCounts = identities.reduce<Record<string, number>>((acc, id) => {
    const key = id.state || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const donutData = Object.entries(stateCounts).map(([state, count]) => ({
    name: state,
    value: count,
    fill:
      state === "active"
        ? stateChartConfig.active.color
        : state === "inactive"
          ? stateChartConfig.inactive.color
          : stateChartConfig.other.color,
  }));

  // Top groups by member count for bar chart
  const barData = [...groups]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 7)
    .map((g) => ({
      name: g.name.length > 16 ? g.name.slice(0, 14) + "…" : g.name,
      memberCount: g.memberCount,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Groups bar chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Groups by Members</CardTitle>
          <CardDescription>Top groups ranked by member count</CardDescription>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No groups yet
            </p>
          ) : (
            <ChartContainer config={groupChartConfig} className="h-52 w-full">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="memberCount" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-1))" maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Identity state donut */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Identity Status</CardTitle>
          <CardDescription>Active vs inactive accounts</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          {donutData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No data</p>
          ) : (
            <ChartContainer config={stateChartConfig} className="h-52 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  strokeWidth={2}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox)) return null;
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {identities.length}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">
                            Total
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
