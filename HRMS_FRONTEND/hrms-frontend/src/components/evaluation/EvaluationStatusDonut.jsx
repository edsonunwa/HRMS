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

const STATUS_COLORS = {
  pending: "#F59E0B",
  evaluated: "#2563EB",
  approved: "#10B981",
};

const STATUS_LABELS = {
  pending: "Pending",
  evaluated: "Evaluated",
  approved: "Approved",
};

export default function EvaluationStatusDonut({ statusBreakdown }) {
  const data = Object.entries(statusBreakdown || {}).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    color: STATUS_COLORS[key] || "#E5E7EB",
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

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
          Evaluation Status
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
                {data.map((item) => (
                  <Cell
                    key={item.name}
                    fill={item.color}
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
              {total}
            </Typography>

            <Typography color="text.secondary">
              Evaluations
            </Typography>
          </Box>
        </Box>

        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
          }}
        >
          {data.map((item) => (
            <Box
              key={item.name}
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
                    backgroundColor: item.color,
                  }}
                />

                <Typography>
                  {item.name}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}