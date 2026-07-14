from django.urls import path
from .views import (
    CycleListCreateView, CycleDetailView,
    KPIListCreateView, KPIDetailView,
    ReviewListCreateView, ReviewDetailView,
    JobEvaluationListCreateView, JobEvaluationDetailView,
)
from .dashboard import EvaluationDashboardAPIView

urlpatterns = [
    path("cycles/",             CycleListCreateView.as_view(),         name="cycle_list"),
    path("cycles/<int:pk>/",    CycleDetailView.as_view(),             name="cycle_detail"),
    path("kpis/",               KPIListCreateView.as_view(),           name="kpi_list"),
    path("kpis/<int:pk>/",      KPIDetailView.as_view(),               name="kpi_detail"),
    path("reviews/",            ReviewListCreateView.as_view(),        name="review_list"),
    path("reviews/<int:pk>/",   ReviewDetailView.as_view(),            name="review_detail"),
    path("job-evaluations/",    JobEvaluationListCreateView.as_view(), name="job_eval_list"),
    path("job-evaluations/<int:pk>/", JobEvaluationDetailView.as_view(), name="job_eval_detail"),
    path("dashboard/",          EvaluationDashboardAPIView.as_view(),  name="eval_dashboard"),
]
