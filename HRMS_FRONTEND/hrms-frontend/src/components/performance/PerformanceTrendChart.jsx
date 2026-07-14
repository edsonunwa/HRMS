import React from "react";
import {
  Card,
  CardContent,
  Typography,
} from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function PerformanceTrendChart({ trend = [] }) {
  const data = trend.length > 0 ? trend : [];

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #E5E7EB",
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 3,
          }}
        >
          Performance Trend
        </Typography>

        <ResponsiveContainer
          width="100%"
          height={350}
        >
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="4 4"
            />

            <XAxis dataKey="month" />

            <YAxis
              domain={[0, 100]}
            />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={4}
              dot={{
                r: 6,
              }}
              activeDot={{
                r: 8,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}