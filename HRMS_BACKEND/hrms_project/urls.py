"""NWSC HRMS — root URL configuration."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/",                  admin.site.urls),
    path("api/auth/",               include("apps.authentication.urls")),
    path("api/employees/",          include("apps.employees.urls")),
    path("api/recruitment/",        include("apps.recruitment.urls")),
    path("api/manpower/",           include("apps.manpower.urls")),
    path("api/leave/",              include("apps.leave.urls")),
    path("api/transfers/",          include("apps.transfers.urls")),
    path("api/performance/",        include("apps.performance.urls")),
    path("api/evaluation/",         include("apps.evaluation.urls")),
    path("api/trainees/",           include("apps.trainees.urls")),
    path("api/reports/",            include("apps.reports.urls")),
    path("api/notifications/",      include("apps.notifications.urls")),
    path("api/token/refresh/",      TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)