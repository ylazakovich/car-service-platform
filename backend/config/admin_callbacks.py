"""
Admin dashboard callback: group app_list to match SIDEBAR (Authorization, Platform).
Central blocks and titles then match the left sidebar.
"""

from config.admin_navigation import group_admin_app_list


def dashboard_callback(request, context):
    app_list = context.get("app_list") or []
    if not isinstance(app_list, list):
        return context
    context["app_list"] = group_admin_app_list(app_list)
    return context
