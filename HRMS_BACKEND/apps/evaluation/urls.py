from django.urls import path
from .views import (
    CycleListCreateView, CycleDetailView,
    KPIListCreateView, KPIDetailView,
    ReviewListCreateView, ReviewDetailView, ReviewKPIsView,
    ReviewSelfAssessView, ReviewConfirmView,
    ReviewSubmitView, ReviewApproveView, DepartmentEmployeesView,
    JobEvaluationListCreateView, JobEvaluationDetailView,
    ManagerRatingListCreateView, SelfRatingView,
)
from .dashboard import EvaluationDashboardAPIView

urlpatterns = [
    path("cycles/",             CycleListCreateView.as_view(),         name="cycle_list"),
    path("cycles/<int:pk>/",    CycleDetailView.as_view(),             name="cycle_detail"),
    path("kpis/",               KPIListCreateView.as_view(),           name="kpi_list"),
    path("kpis/<int:pk>/",      KPIDetailView.as_view(),               name="kpi_detail"),
    path("reviews/",            ReviewListCreateView.as_view(),        name="review_list"),
    path("reviews/<int:pk>/",   ReviewDetailView.as_view(),            name="review_detail"),
    path("reviews/<int:pk>/kpis/",   ReviewKPIsView.as_view(),            name="review_kpis"),
    path("reviews/<int:pk>/self-assess/", ReviewSelfAssessView.as_view(),  name="review_self_assess"),
    path("reviews/<int:pk>/confirm/",     ReviewConfirmView.as_view(),      name="review_confirm"),
    path("reviews/<int:pk>/submit/",     ReviewSubmitView.as_view(),        name="review_submit"),
    path("reviews/<int:pk>/approve/",     ReviewApproveView.as_view(),      name="review_approve"),
    path("self-rating/",          SelfRatingView.as_view(),              name="self_rating"),
    path("manager-ratings/",      ManagerRatingListCreateView.as_view(), name="manager_ratings"),
    path("department-employees/", DepartmentEmployeesView.as_view(), name="department_employees"),
    path("job-evaluations/",    JobEvaluationListCreateView.as_view(), name="job_eval_list"),
    path("job-evaluations/<int:pk>/", JobEvaluationDetailView.as_view(), name="job_eval_detail"),
    path("dashboard/",          EvaluationDashboardAPIView.as_view(),  name="eval_dashboard"),
]
