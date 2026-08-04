"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryData = {
  _id: string;
  new_market_demand: number;
  new_price: number;
  createdAt: string;
};

export default function CargoMarketChart({
  historyData,
  themeColor,
}: {
  historyData: HistoryData[];
  themeColor: "blue" | "red";
}) {
  const chartData = useMemo(() => {
    return historyData
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((item) => {
        const date = new Date(item.createdAt);
        return {
          time: `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")} - ${date.getDate()}/${date.getMonth() + 1}`,
          demand: item.new_market_demand,
          price: item.new_price,
          rawDate: date,
        };
      });
  }, [historyData]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground bg-black/5 rounded-xl border border-border/50">
        <p>Belum ada data pergerakan pasar untuk kargo ini.</p>
      </div>
    );
  }

  const colorStr = themeColor === "blue" ? "#3b82f6" : "#ef4444";

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colorStr} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colorStr} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card border border-border/50 shadow-xl rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      {label}
                    </p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">Market Demand:</span>
                        <span className={`text-sm font-black ${themeColor === "blue" ? "text-blue-500" : "text-red-500"}`}>
                          {payload[0].payload.demand > 0 ? "+" : ""}{payload[0].payload.demand}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">Income Final:</span>
                        <span className="text-sm font-black text-foreground">
                          {payload[0].payload.price.toLocaleString("id-ID")} NC
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="demand"
            stroke={colorStr}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorDemand)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
