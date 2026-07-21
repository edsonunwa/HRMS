from rest_framework import serializers
from .models import PerformanceCycle, KPI, PerformanceReview, JobEvaluation


class PerformanceCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PerformanceCycle
        fields = "__all__"


class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model  = KPI
        fields = "__all__"

    def validate_weight(self, value):
        if not (5 <= value <= 100):
            raise serializers.ValidationError("Weight must be between 5 and 100.")
        return value


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name   = serializers.ReadOnlyField(source="employee.full_name")
    appraiser_name  = serializers.ReadOnlyField(source="appraiser.full_name")
    cycle_name      = serializers.ReadOnlyField(source="cycle.name")
    kpis            = KPISerializer(source="employee.kpis", many=True, read_only=True)

    class Meta:
        model  = PerformanceReview
        fields = "__all__"
        read_only_fields = ["overall_score", "grade", "status", "created_at", "appraiser", "appraiser_score", "appraiser_comments"]


class JobEvaluationSerializer(serializers.ModelSerializer):
    position_title          = serializers.ReadOnlyField(source="position.title")
    recommended_grade_level = serializers.ReadOnlyField(source="recommended_grade.level")

    class Meta:
        model  = JobEvaluation
        fields = "__all__"
        read_only_fields = ["evaluated_by","evaluated_at"]

    def create(self, validated_data):
        validated_data["evaluated_by"] = self.context["request"].user
        return super().create(validated_data)