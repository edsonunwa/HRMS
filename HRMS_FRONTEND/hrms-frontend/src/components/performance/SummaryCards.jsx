import React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import {
  TrendingUp,
  AssignmentTurnedIn,
  TrackChanges,
  CalendarMonth,
} from "@mui/icons-material";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      title: "Average Score",
      value: summary ? `${summary.average_score}%` : "—",
      subtitle: "Overall organisation score",
      icon: <TrendingUp sx={{ fontSize: 34 }} />,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      title: "Completed Reviews",
      value: summary ? String(summary.completed_reviews) : "—",
      subtitle: "Performance reviews completed",
      icon: <AssignmentTurnedIn sx={{ fontSize: 34 }} />,
      color: "#059669",
      background: "#ecfdf5",
    },
    {
      title: "Active Cycle",
      value: summary ? summary.active_cycle : "—",
      subtitle: "Current performance cycle",
      icon: <CalendarMonth sx={{ fontSize: 34 }} />,
      color: "#d97706",
      background: "#fffbeb",
    },
    {
      title: "Total KPIs",
      value: summary ? String(summary.total_kpis) : "—",
      subtitle: "Assigned KPIs",
      icon: <TrackChanges sx={{ fontSize: 34 }} />,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cards.map((card) => (
        <Grid
          key={card.title}
          size={{
            xs: 12,
            sm: 6,
            lg: 3,
          }}
        >
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "1px solid #E5E7EB",
              transition: "all .25s ease",
              height: "100%",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 30px rgba(0,0,0,.08)",
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {card.title}
                  </Typography>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {card.value}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                    }}
                  >
                    {card.subtitle}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: card.background,
                    color: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}