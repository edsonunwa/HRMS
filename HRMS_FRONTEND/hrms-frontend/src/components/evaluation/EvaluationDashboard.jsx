import React, { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";

import EvaluationSummaryCards from "./EvaluationSummaryCards";
import EvaluationStatusDonut from "./EvaluationStatusDonut";
import ScoreDistributionDonut from "./ScoreDistributionDonut";
import PositionScoreChart from "./PositionScoreChart";
import { evaluationService } from "../../services/performanceService";

export default function EvaluationDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await evaluationService.getDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to load evaluation dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
        No evaluation data available.
      </Box>
    );
  }

  const { summary, status_breakdown, score_distribution, position_scores } = dashboardData;

  return (
    <Box sx={{ mb: 4 }}>
      <EvaluationSummaryCards summary={summary} />

      {summary.can_create_evaluation && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <button onClick={() => alert("Create Evaluation - implement form")}>
            + New Evaluation
          </button>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1fr 1fr",
          },
          gap: 3,
          mb: 3,
        }}
      >
        <EvaluationStatusDonut statusBreakdown={status_breakdown} />
        <ScoreDistributionDonut scoreDistribution={score_distribution} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
          },
          gap: 3,
        }}
      >
        <PositionScoreChart positionScores={position_scores} />
      </Box>
    </Box>
  );
}