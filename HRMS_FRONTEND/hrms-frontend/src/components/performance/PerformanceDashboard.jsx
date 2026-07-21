import React, { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";

import SummaryCards from "./SummaryCards";
import PerformanceDonut from "./PerformanceDonut";
import ReviewStatusDonut from "./ReviewStatusDonut";
import PerformanceTrendChart from "./PerformanceTrendChart";
import DepartmentPerformanceChart from "./DepartmentPerformanceChart";
import { performanceService } from "../../services/performanceService";

export default function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await performanceService.getDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to load performance dashboard", err);
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
        No performance data available.
      </Box>
    );
  }

  const { summary, review_status, trend, departments } = dashboardData;

  return (
    <Box sx={{ mb: 4 }}>
      <SummaryCards summary={summary} />

      {summary.user_role === "hr_officer" || summary.user_role === "hr_director" || summary.user_role === "admin" ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <button onClick={() => alert("Create KPI - implement form")}>
            + New KPI
          </button>
        </Box>
      ) : null}

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
        <PerformanceDonut averageScore={summary.average_score} />
        <ReviewStatusDonut reviewStatus={review_status} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "2fr 1fr",
          },
          gap: 3,
        }}
      >
        <PerformanceTrendChart trend={trend} />
        <DepartmentPerformanceChart departments={departments} />
      </Box>
    </Box>
  );
}