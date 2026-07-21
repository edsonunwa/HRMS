import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#2563EB", "#E5E7EB"];

export default function PerformanceDonut({ averageScore = 0 }) {
  const completed = Math.min(Math.round(averageScore), 100);
  const remaining = 100 - completed;

  const data = [
    { name: "Completed", value: completed },
    { name: "Remaining", value: remaining },
  ];

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
          Average Performance
        </Typography>

        <Box
          sx={{
            width: "100%",
            height: 320,
            position: "relative",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={85}
                outerRadius={115}
                startAngle={90}
                endAngle={450}
                paddingAngle={2}
                cornerRadius={12}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
              }}
            >
              {completed}%
            </Typography>

            <Typography
              color="text.secondary"
            >
              Overall Score
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}