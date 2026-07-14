from django.urls import path
from .views import TransferListCreateView, TransferDetailView, ApproveTransferView, CancelTransferView

urlpatterns = [
    path("",             TransferListCreateView.as_view(), name="transfer_list"),
    path("<int:pk>/",    TransferDetailView.as_view(),     name="transfer_detail"),
    path("<int:pk>/approve/", ApproveTransferView.as_view(), name="transfer_approve"),
    path("<int:pk>/cancel/",  CancelTransferView.as_view(),  name="transfer_cancel"),
]