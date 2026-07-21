import React from "react";
import {
  Card,
  CardContent,
  Typography,
} from "@mui/material";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function PositionScoreChart({ positionScores = [] }) {
  const data = positionScores.length > 0 ? positionScores : [];

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #E5E7EB",
        height: "100%",
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
          Position Scores
        </Typography>

        <ResponsiveContainer
          width="100%"
          height={350}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              left: 20,
              right: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              domain={[0, 100]}
            />

            <YAxis
              dataKey="position"
              type="category"
              width={120}
            />

            <Tooltip />

            <Bar
              dataKey="score"
              radius={[0, 10, 10, 0]}
              fill="#059669"
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}