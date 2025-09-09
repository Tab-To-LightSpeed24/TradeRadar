"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PnLChartProps {
  data: {
    date: string;
    pnl: number;
  }[];
}

export const PnLChart = ({ data }: PnLChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Not enough trade data to display chart.
          </div>
        </CardContent>
      </Card>
    );
  }

  const finalPnl = data[data.length - 1].pnl;
  const strokeColor = finalPnl >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))";
  const gradientColor = finalPnl >= 0 ? "hsl(var(--primary) / 0.2)" : "hsl(var(--destructive) / 0.2)";

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={gradientColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))"
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
              />
              <Area 
                type="monotone" 
                dataKey="pnl" 
                stroke={strokeColor}
                fillOpacity={1} 
                fill="url(#colorPnl)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};