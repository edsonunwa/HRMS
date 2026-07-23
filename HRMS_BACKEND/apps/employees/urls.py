from django.urls import path
from .views import (BranchListCreateView,BranchDetailView,
    DepartmentListCreateView, DepartmentDetailView,
    GradeListCreateView, GradeDetailView,
    PositionListCreateView, PositionDetailView,
    EmployeeListCreateView, EmployeeDetailView, MyProfileView,
)

urlpatterns = [
    path('',                     EmployeeListCreateView.as_view(), name='employee_list'),
    path('<int:pk>/',            EmployeeDetailView.as_view(),     name='employee_detail'),
    path('me/',                  MyProfileView.as_view(),          name='my_profile'),
    path('departments/',         DepartmentListCreateView.as_view(),name='dept_list'),
    path('departments/<int:pk>/',DepartmentDetailView.as_view(),   name='dept_detail'),
    path('grades/',              GradeListCreateView.as_view(),    name='grade_list'),
    path('grades/<int:pk>/',     GradeDetailView.as_view(),        name='grade_detail'),
    path('positions/',           PositionListCreateView.as_view(), name='pos_list'),
    path('positions/<int:pk>/',  PositionDetailView.as_view(),     name='pos_detail'),
    path("branches/",            BranchListCreateView.as_view(),   name="branch-list"),
    path("branches/<int:pk>/",   BranchDetailView.as_view(),       name="branch-detail"),
]