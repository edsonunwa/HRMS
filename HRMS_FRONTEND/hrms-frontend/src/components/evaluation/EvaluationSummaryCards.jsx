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
  Assessment,
  PendingActions,
  CheckCircle,
  HowToVote,
} from "@mui/icons-material";

export default function EvaluationSummaryCards({ summary }) {
  const cards = [
    {
      title: "Total Evaluations",
      value: summary ? String(summary.total_evaluations) : "—",
      subtitle: "Job evaluations conducted",
      icon: <Assessment sx={{ fontSize: 34 }} />,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      title: "Average Score",
      value: summary ? `${summary.overall_avg_score}%` : "—",
      subtitle: "Overall evaluation score",
      icon: <HowToVote sx={{ fontSize: 34 }} />,
      color: "#059669",
      background: "#ecfdf5",
    },
    {
      title: "Pending",
      value: summary ? String(summary.pending) : "—",
      subtitle: "Awaiting evaluation",
      icon: <PendingActions sx={{ fontSize: 34 }} />,
      color: "#d97706",
      background: "#fffbeb",
    },
    {
      title: "Approved",
      value: summary ? String(summary.approved) : "—",
      subtitle: "Approved evaluations",
      icon: <CheckCircle sx={{ fontSize: 34 }} />,
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