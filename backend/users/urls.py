from django.urls import path

from .views import AcceptInviteView, CsrfView, InviteCreateView, LoginView, LogoutView, MeView, ResetInviteView, StaffListView, UserListView, UserUpdateView

urlpatterns = [
    path("csrf", CsrfView.as_view(), name="auth-csrf"),
    path("login", LoginView.as_view(), name="auth-login"),
    path("logout", LogoutView.as_view(), name="auth-logout"),
    path("me", MeView.as_view(), name="auth-me"),
    path("staff/", StaffListView.as_view(), name="staff-list"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserUpdateView.as_view(), name="user-update"),
    path("users/invite/", InviteCreateView.as_view(), name="invite-create"),
    path("users/invite/accept", AcceptInviteView.as_view(), name="invite-accept"),
    path("users/<int:pk>/reset-invite/", ResetInviteView.as_view(), name="invite-reset"),
]
