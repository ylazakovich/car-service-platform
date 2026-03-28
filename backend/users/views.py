import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

LOGIN_RATE_LIMIT = 10
LOGIN_BLOCK_SECONDS = 60

from .models import InviteToken, User
from .serializers import AcceptInviteSerializer, InviteCreateSerializer, LoginSerializer, UserListSerializer, UserSerializer

logger = logging.getLogger(__name__)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"detail": "CSRF cookie set"}, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", "")).split(",")[0].strip()
        cache_key = f"login_attempts:{ip}"
        attempts = cache.get(cache_key, 0)

        if attempts >= LOGIN_RATE_LIMIT:
            return Response(
                {"detail": "Too many login attempts. Please wait 1 minute."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active:
            cache.set(cache_key, attempts + 1, LOGIN_BLOCK_SECONDS)
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        cache.delete(cache_key)
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out"}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class StaffListView(generics.ListAPIView):
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role="staff").order_by("first_name", "last_name", "id")


class UserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")
        return Response(UserListSerializer(users, many=True).data)


class UserUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        first_name = request.data.get("first_name", user.first_name)
        last_name = request.data.get("last_name", user.last_name)
        user.first_name = first_name.strip()
        user.last_name = last_name.strip()
        user.save(update_fields=["first_name", "last_name"])
        return Response(UserListSerializer(user).data)


class InviteCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = InviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")

        user = User(email=email, role=role, is_staff=(role == "admin"), first_name=first_name, last_name=last_name)
        user.set_unusable_password()
        user.save()

        InviteToken.objects.filter(user=user).delete()
        invite = InviteToken.objects.create(user=user)

        invite_url = f"{settings.FRONTEND_URL}/invite/accept?token={invite.token}"

        try:
            send_mail(
                subject="You've been invited to Car Service Platform",
                message=(
                    f"You have been invited to Car Service Platform.\n\n"
                    f"Click the link below to set your password and activate your account:\n\n"
                    f"{invite_url}\n\n"
                    f"This link expires in 7 days."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
        except Exception:
            logger.warning("Failed to send invite email to %s", user.email)

        return Response(
            {"id": user.id, "email": user.email, "role": user.role, "invite_url": str(invite_url)},
            status=status.HTTP_201_CREATED,
        )


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invite = InviteToken.objects.select_related("user").get(
                token=serializer.validated_data["token"]
            )
        except InviteToken.DoesNotExist:
            return Response({"detail": "Invalid or expired invite link"}, status=status.HTTP_400_BAD_REQUEST)

        if invite.is_expired:
            invite.delete()
            return Response({"detail": "This invite link has expired"}, status=status.HTTP_400_BAD_REQUEST)

        user = invite.user
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        invite.delete()

        return Response({"detail": "Password set successfully. You can now sign in."})


class ResetInviteView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        InviteToken.objects.filter(user=user).delete()
        user.set_unusable_password()
        user.save(update_fields=["password"])

        invite = InviteToken.objects.create(user=user)
        invite_url = f"{settings.FRONTEND_URL}/invite/accept?token={invite.token}"

        try:
            send_mail(
                subject="Password Reset - Car Service Platform",
                message=(
                    f"Your password has been reset by an administrator.\n\n"
                    f"Click the link below to set a new password:\n\n"
                    f"{invite_url}\n\n"
                    f"This link expires in 7 days."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
        except Exception:
            logger.warning("Failed to send password reset email to %s", user.email)

        return Response({"invite_url": str(invite_url)})
