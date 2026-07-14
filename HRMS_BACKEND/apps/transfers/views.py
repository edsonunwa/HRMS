from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Transfer
from .serializers import TransferSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from apps.authentication.permissions import CanCreateTransfer
from apps.authentication.audit import AuditLogMixin, log_audit_event


class TransferListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = TransferSerializer
    permission_classes = [CanCreateTransfer]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status", "transfer_type", "from_department", "to_department", "is_hr_record"]
    search_fields      = ["employee__employee_id", "employee__user__first_name"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin","senior_management","board"):
            return Transfer.objects.select_related("employee","from_department","to_department").all()
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                return Transfer.objects.none()
            dept = profile.department
            return Transfer.objects.filter(from_department=dept) | Transfer.objects.filter(to_department=dept)
        profile = user.get_employee_profile()
        if profile is None:
            return Transfer.objects.none()
        return Transfer.objects.filter(employee=profile)


class TransferDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Transfer.objects.all()
    serializer_class   = TransferSerializer
    permission_classes = [IsDepartmentHeadOrAbove]


class ApproveTransferView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        try:
            transfer = Transfer.objects.get(pk=pk)
        except Transfer.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        decision = request.data.get("decision")
        if decision not in ("approved","rejected"):
            return Response({"detail": "decision must be approved or rejected."}, status=400)

        transfer.status           = decision
        transfer.approved_by      = request.user
        transfer.approval_comment = request.data.get("comment","")
        transfer.save()

        # On approval, update the employee record
        if decision == "approved":
            emp = transfer.employee
            emp.department = transfer.to_department
            if transfer.to_position:
                emp.position = transfer.to_position
            emp.save()

        log_audit_event(
            action='UPDATE',
            resource='Transfer',
            request=request,
            user=request.user,
            instance=transfer,
            detail=f'Transfer #{transfer.pk} {decision}',
            metadata={'decision': decision},
        )

        return Response(TransferSerializer(transfer, context={"request": request}).data)


class CancelTransferView(APIView):
    """
    POST /api/transfers/<pk>/cancel/
    Employee may cancel their own request only while it is still pending.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            transfer = Transfer.objects.get(pk=pk)
        except Transfer.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        profile = request.user.get_employee_profile()
        if profile is None or transfer.employee_id != profile.id:
            return Response(
                {"detail": "You can only cancel your own transfer requests."},
                status=403,
            )

        if transfer.status != "pending":
            return Response(
                {"detail": "This request can no longer be cancelled."},
                status=400,
            )

        transfer.status = "cancelled"
        transfer.save(update_fields=["status", "updated_at"])
        return Response(TransferSerializer(transfer, context={"request": request}).data)