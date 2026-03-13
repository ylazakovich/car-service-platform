from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_staff"]
        read_only_fields = fields


class CsrfSerializer(serializers.Serializer):
    detail = serializers.CharField(read_only=True)
