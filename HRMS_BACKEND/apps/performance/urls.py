from django.urls import path
from .dashboard import PerformanceDashboardAPIView

urlpatterns = [
    path("dashboard/", PerformanceDashboardAPIView.as_view(), name="perf_dashboard"),
]