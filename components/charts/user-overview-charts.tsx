"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
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
  type ChartConfig,
} from "@/components/ui/chart";

interface UserOverviewChartsProps {
  userGroups: { name: string; memberCount: number }[];
  gitlabRoles: { role: string; resourceType: string }[];
  orgRole: string | null;
}

const groupChartConfig = {
  memberCount: { label: "Members", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const accessChartConfig = {
  value: { label: "Access" },
  organization: { label: "Organization", color: "hsl(var(--chart-1))" },
  groups: { label: "Groups", color: "hsl(var(--chart-2))" },
  gitlab: { label: "GitLab", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const MAX_GROUPS = 10;
const MAX_GITLAB = 10;

export function UserOverviewCharts({
  userGroups,
  gitlabRoles,
  orgRole,
}: UserOverviewChartsProps) {
  // Bar chart: group sizes
  const groupBarData = userGroups
    .sort((a, b) => b.memberCount - a.memberCount)
    .map((g) => ({
      name: g.name.length > 14 ? g.name.slice(0, 12) + "…" : g.name,
      memberCount: g.memberCount,
    }));

  // Radial chart: access coverage
  const radialData = [
    {
      name: "organization",
      label: "Organization",
      value: orgRole ? 100 : 0,
      fill: accessChartConfig.organization.color,
    },
    {
      name: "groups",
      label: "Groups",
      value: Math.min(Math.round((userGroups.length / MAX_GROUPS) * 100), 100),
      fill: accessChartConfig.groups.color,
    },
    {
      name: "gitlab",
      label: "GitLab",
      value: Math.min(Math.round((gitlabRoles.length / MAX_GITLAB) * 100), 100),
      fill: accessChartConfig.gitlab.color,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Group sizes bar chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My Groups</CardTitle>
          <CardDescription>Member counts across your groups</CardDescription>
        </CardHeader>
        <CardContent>
          {groupBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              You are not a member of any groups yet.
            </p>
          ) : (
            <ChartContainer config={groupChartConfig} className="h-52 w-full">
              <BarChart
                data={groupBarData}
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

      {/* Access coverage radial chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Access Coverage</CardTitle>
          <CardDescription>Your access across platform areas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={accessChartConfig} className="h-52 w-full">
            <RadialBarChart
              data={radialData}
              innerRadius={30}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="label"
                    formatter={(value) => [`${value}%`, ""]}
                  />
                }
              />
              <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={4} />
            </RadialBarChart>
          </ChartContainer>
          {/* Legend */}
          <div className="flex flex-col gap-1.5 mt-2">
            {radialData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.label}</span>
                </div>
                <span className="font-medium tabular-nums">{d.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
