import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
} from "@mui/material";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const DISTRIBUTION_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#3B82F6",
  "#10B981",
];

export default function ScoreDistributionDonut({ scoreDistribution = [] }) {
  const data = scoreDistribution.length > 0 ? scoreDistribution : [];

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
          Score Distribution
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
                dataKey="count"
                nameKey="range"
                innerRadius={85}
                outerRadius={115}
                startAngle={90}
                endAngle={450}
                paddingAngle={2}
                cornerRadius={12}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.range}
                    fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]}
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
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
              }}
            >
              {data.reduce((s, d) => s + d.count, 0)}
            </Typography>

            <Typography color="text.secondary">
              Total
            </Typography>
          </Box>
        </Box>

        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
          }}
        >
          {data.map((item, index) => (
            <Box
              key={item.range}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
                  }}
                />

                <Typography>
                  {item.range}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {item.count}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}