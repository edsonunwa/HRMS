from django.urls import path
from .views import (
    ReportListView,
    ReportTypesView,
    ReportGenerateView,
    ReportReferenceDataView,
    HeadcountSummaryView,
    LeaveSummaryView,
    RecruitmentSummaryView,
    PerformanceSummaryView,
    TransferSummaryView,
    ManpowerSummaryView,
    TraineeSummaryView,
)

urlpatterns = [
    # Report history & metadata
    path("",                    ReportListView.as_view(),         name="report_list"),
    path("types/",              ReportTypesView.as_view(),        name="report_types"),
    path("generate/",           ReportGenerateView.as_view(),     name="report_generate"),
    path("reference-data/",     ReportReferenceDataView.as_view(),name="report_reference_data"),

    # Summary / analytics endpoints
    path("headcount/",          HeadcountSummaryView.as_view(),   name="report_headcount"),
    path("leave/",              LeaveSummaryView.as_view(),       name="report_leave"),
    path("recruitment/",        RecruitmentSummaryView.as_view(), name="report_recruitment"),
    path("performance/",        PerformanceSummaryView.as_view(), name="report_performance"),
    path("transfers/",          TransferSummaryView.as_view(),    name="report_transfers"),
    path("manpower/",           ManpowerSummaryView.as_view(),    name="report_manpower"),
    path("trainees/",           TraineeSummaryView.as_view(),     name="report_trainees"),
]