from django.urls import path
from .views import (
    LeaveTypeListCreateView, LeaveTypeDetailView,
    LeaveBalanceListView,
    LeaveRequestListCreateView, LeaveRequestDetailView,
    ApproveLeaveView, CancelLeaveView,
)

urlpatterns = [
    path('types/',                     LeaveTypeListCreateView.as_view(),   name='leave_type_list'),
    path('types/<int:pk>/',            LeaveTypeDetailView.as_view(),       name='leave_type_detail'),
    path('balances/',                  LeaveBalanceListView.as_view(),      name='leave_balance'),
    path('requests/',                  LeaveRequestListCreateView.as_view(),name='leave_request_list'),
    path('requests/<int:pk>/',         LeaveRequestDetailView.as_view(),    name='leave_request_detail'),
    path('requests/<int:pk>/approve/', ApproveLeaveView.as_view(),          name='leave_approve'),
    path('requests/<int:pk>/cancel/',  CancelLeaveView.as_view(),           name='leave_cancel'),
]