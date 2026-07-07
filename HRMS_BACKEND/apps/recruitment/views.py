from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from .models import JobPosting, JobApplication, Interview, JobOffer
from .serializers import (
    JobPostingSerializer, JobApplicationSerializer,
    InterviewSerializer, JobOfferSerializer,
)
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove


class JobPostingListCreateView(generics.ListCreateAPIView):
    serializer_class = JobPostingSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'department', 'job_type']
    search_fields    = ['title', 'reference_no', 'description']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsHROrAdmin()]

    def get_queryset(self):
        qs = JobPosting.objects.select_related('department', 'posted_by').all()
        if not (self.request.user.is_authenticated and
                self.request.user.role in ('hr_officer','admin')):
            qs = qs.filter(status='open')
        return qs


class JobPostingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = JobPosting.objects.all()
    serializer_class   = JobPostingSerializer
    permission_classes = [IsHROrAdmin]


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class   = JobApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['status', 'job']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer','admin','department_head'):
            return JobApplication.objects.select_related('applicant','job').all()
        return JobApplication.objects.filter(applicant=user)


class ApplicationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer','admin'):
            return JobApplication.objects.all()
        return JobApplication.objects.filter(applicant=user)


class UpdateApplicationStatusView(APIView):
    permission_classes = [IsHROrAdmin]

    def patch(self, request, pk):
        try:
            app = JobApplication.objects.get(pk=pk)
        except JobApplication.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        new_status = request.data.get('status')
        if new_status not in dict(JobApplication.STATUS):
            return Response({'detail': 'Invalid status.'}, status=400)
        app.status = new_status
        if request.data.get('rejection_reason'):
            app.rejection_reason = request.data['rejection_reason']
        app.save()
        return Response(JobApplicationSerializer(app).data)


class InterviewListCreateView(generics.ListCreateAPIView):
    queryset           = Interview.objects.select_related('application').all()
    serializer_class   = InterviewSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['outcome', 'interview_type']


class InterviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Interview.objects.all()
    serializer_class   = InterviewSerializer
    permission_classes = [IsDepartmentHeadOrAbove]


class JobOfferListCreateView(generics.ListCreateAPIView):
    queryset           = JobOffer.objects.all()
    serializer_class   = JobOfferSerializer
    permission_classes = [IsHROrAdmin]


class JobOfferDetailView(generics.RetrieveUpdateAPIView):
    queryset           = JobOffer.objects.all()
    serializer_class   = JobOfferSerializer
    permission_classes = [IsAuthenticated]