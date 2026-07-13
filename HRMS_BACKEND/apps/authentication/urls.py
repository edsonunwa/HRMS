from django.urls import path
from .views import LoginView, LogoutView, MeView, ChangePasswordView, UserListCreateView, UserDetailView, UserWithoutEmployeeProfileView, AuditLogListView

urlpatterns = [
    path('login/',                    LoginView.as_view(),                     name='login'),
    path('logout/',                   LogoutView.as_view(),                    name='logout'),
    path('me/',                       MeView.as_view(),                        name='me'),
    path('change-password/',          ChangePasswordView.as_view(),            name='change_password'),
    path('users/',                    UserListCreateView.as_view(),            name='user_list'),
    path('users/without-profile/',    UserWithoutEmployeeProfileView.as_view(),name='users_without_profile'),
    path('users/<int:pk>/',           UserDetailView.as_view(),                name='user_detail'),
    path('audit-logs/',      AuditLogListView.as_view(),    name='audit_log_list'),
]