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
from apps.authentication.audit import AuditLogMixin, log_audit_event


class JobPostingListCreateView(AuditLogMixin, generics.ListCreateAPIView):
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
                self.request.user.role in ('hr_officer','hr_director','admin')):
            qs = qs.filter(status='open')
        return qs


class JobPostingDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = JobPosting.objects.all()
    serializer_class   = JobPostingSerializer
    permission_classes = [IsHROrAdmin]


class ApplicationListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = JobApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['status', 'job']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer','hr_director','admin','department_head'):
            return JobApplication.objects.select_related('applicant','job').all()
        return JobApplication.objects.filter(applicant=user)


class ApplicationDetailView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    serializer_class   = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer','hr_director','admin'):
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
        log_audit_event(
            action='UPDATE',
            resource='JobApplication',
            request=request,
            user=request.user,
            instance=app,
            detail=f'Updated application #{app.pk} to {new_status}',
            metadata={'status': new_status},
        )
        return Response(JobApplicationSerializer(app).data)


class InterviewListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = Interview.objects.select_related('application').all()
    serializer_class   = InterviewSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['outcome', 'interview_type']


class InterviewDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Interview.objects.all()
    serializer_class   = InterviewSerializer
    permission_classes = [IsDepartmentHeadOrAbove]


class JobOfferListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = JobOffer.objects.all()
    serializer_class   = JobOfferSerializer
    permission_classes = [IsHROrAdmin]


class JobOfferDetailView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    queryset           = JobOffer.objects.all()
    serializer_class   = JobOfferSerializer
    permission_classes = [IsAuthenticated]