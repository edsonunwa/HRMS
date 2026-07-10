from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Transfer
from .serializers import TransferSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove


class TransferListCreateView(generics.ListCreateAPIView):
    serializer_class   = TransferSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status", "transfer_type", "from_department", "to_department"]
    search_fields      = ["employee__employee_id", "employee__user__first_name"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin","senior_management","board"):
            return Transfer.objects.select_related("employee","from_department","to_department").all()
        if user.role == "department_head":
            dept = user.employee_profile.department
            return Transfer.objects.filter(from_department=dept) | Transfer.objects.filter(to_department=dept)
        return Transfer.objects.filter(employee=user.employee_profile)


class TransferDetailView(generics.RetrieveUpdateDestroyAPIView):
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

        return Response({"detail": f"Transfer {decision}."})