from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import TrainingProgram, Trainee, TraineeAssessment, TraineeCourse
from .serializers import TrainingProgramSerializer, TraineeSerializer, TraineeAssessmentSerializer, TraineeCourseSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from apps.authentication.audit import AuditLogMixin, log_audit_event


class TrainingProgramListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = TrainingProgram.objects.select_related("department","coordinator").all()
    serializer_class   = TrainingProgramSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["program_type","status","department"]
    search_fields      = ["title"]


class TrainingProgramDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = TrainingProgram.objects.all()
    serializer_class   = TrainingProgramSerializer
    permission_classes = [IsHROrAdmin]


class TraineeListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = TraineeSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["trainee_type","status","department","program"]
    search_fields      = ["user__first_name","user__last_name","institution"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin"):
            return Trainee.objects.all()
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                return Trainee.objects.none()
            return Trainee.objects.filter(department=profile.department)
        try:
            return Trainee.objects.filter(user=user)
        except Exception:
            return Trainee.objects.none()


class TraineeDetailView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    queryset           = Trainee.objects.all()
    serializer_class   = TraineeSerializer
    permission_classes = [IsAuthenticated]


class TraineeAssessmentListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = TraineeAssessmentSerializer
    permission_classes = [IsDepartmentHeadOrAbove]

    def get_queryset(self):
        return TraineeAssessment.objects.filter(trainee_id=self.kwargs.get("trainee_pk"))

    def perform_create(self, serializer):
        instance = serializer.save(trainee_id=self.kwargs.get("trainee_pk"))
        log_audit_event(
            action='CREATE',
            resource='TraineeAssessment',
            request=self.request,
            user=self.request.user,
            instance=instance,
            detail=f'Created trainee assessment #{instance.pk}',
            metadata={'trainee_pk': self.kwargs.get("trainee_pk")},
        )


class TraineeCourseListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = TraineeCourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TraineeCourse.objects.filter(trainee_id=self.kwargs.get("trainee_pk"))

    def perform_create(self, serializer):
        instance = serializer.save(trainee_id=self.kwargs.get("trainee_pk"))
        log_audit_event(
            action='CREATE',
            resource='TraineeCourse',
            request=self.request,
            user=self.request.user,
            instance=instance,
            detail=f'Created trainee course #{instance.pk}',
            metadata={'trainee_pk': self.kwargs.get("trainee_pk")},
        )


class MyTraineeProfileView(generics.RetrieveAPIView):
    serializer_class   = TraineeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.trainee_profile