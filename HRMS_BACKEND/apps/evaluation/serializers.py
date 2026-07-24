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
        read_only_fields = ["overall_score", "grade", "status", "created_at", "appraiser", "appraiser_score", "appraiser_comments", "hod_comments", "hod_reviewed_at"]


class SelfRatingSerializer(serializers.ModelSerializer):
    """Serializer for employee self-rating on Communication, Productivity, Innovation."""
    employee_name = serializers.ReadOnlyField(source="employee.full_name")
    cycle_name    = serializers.ReadOnlyField(source="cycle.name")

    class Meta:
        model  = PerformanceReview
        fields = [
            "id", "employee", "employee_name", "cycle", "cycle_name",
            "self_communication_score", "self_productivity_score", "self_innovation_score",
            "self_comment", "status", "hod_comments",
        ]
        read_only_fields = ["status", "hod_comments"]

    def validate_self_communication_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value

    def validate_self_productivity_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value

    def validate_self_innovation_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value


class ManagerRatingSerializer(serializers.ModelSerializer):
    """Serializer for department head to submit manager ratings."""
    employee_name = serializers.ReadOnlyField(source="employee.full_name")
    cycle_name    = serializers.ReadOnlyField(source="cycle.name")

    class Meta:
        model  = PerformanceReview
        fields = [
            "id", "employee", "employee_name", "cycle", "cycle_name",
            "communication_score", "productivity_score", "innovation_score",
            "manager_comment",
        ]

    def validate_communication_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value

    def validate_productivity_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value

    def validate_innovation_score(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value


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
