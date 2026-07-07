from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import TrainingProgram, Trainee, TraineeAssessment, TraineeCourse
from .serializers import TrainingProgramSerializer, TraineeSerializer, TraineeAssessmentSerializer, TraineeCourseSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove


class TrainingProgramListCreateView(generics.ListCreateAPIView):
    queryset           = TrainingProgram.objects.select_related("department","coordinator").all()
    serializer_class   = TrainingProgramSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["program_type","status","department"]
    search_fields      = ["title"]


class TrainingProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = TrainingProgram.objects.all()
    serializer_class   = TrainingProgramSerializer
    permission_classes = [IsHROrAdmin]


class TraineeListCreateView(generics.ListCreateAPIView):
    serializer_class   = TraineeSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["trainee_type","status","department","program"]
    search_fields      = ["user__first_name","user__last_name","institution"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","admin"):
            return Trainee.objects.all()
        if user.role == "department_head":
            return Trainee.objects.filter(department=user.employee_profile.department)
        try:
            return Trainee.objects.filter(user=user)
        except Exception:
            return Trainee.objects.none()


class TraineeDetailView(generics.RetrieveUpdateAPIView):
    queryset           = Trainee.objects.all()
    serializer_class   = TraineeSerializer
    permission_classes = [IsAuthenticated]


class TraineeAssessmentListCreateView(generics.ListCreateAPIView):
    serializer_class   = TraineeAssessmentSerializer
    permission_classes = [IsDepartmentHeadOrAbove]

    def get_queryset(self):
        return TraineeAssessment.objects.filter(trainee_id=self.kwargs.get("trainee_pk"))

    def perform_create(self, serializer):
        serializer.save(trainee_id=self.kwargs.get("trainee_pk"))


class TraineeCourseListCreateView(generics.ListCreateAPIView):
    serializer_class   = TraineeCourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TraineeCourse.objects.filter(trainee_id=self.kwargs.get("trainee_pk"))

    def perform_create(self, serializer):
        serializer.save(trainee_id=self.kwargs.get("trainee_pk"))


class MyTraineeProfileView(generics.RetrieveAPIView):
    serializer_class   = TraineeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.trainee_profile