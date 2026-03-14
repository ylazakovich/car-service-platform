"""
Admin dashboard callback: group app_list to match SIDEBAR (Authorization, Platform).
Central blocks and titles then match the left sidebar.
"""


def dashboard_callback(request, context):
    app_list = context.get("app_list") or []
    auth_models = []
    platform_models = []

    for app in app_list:
        app_label = app.get("app_label", "")
        for model in app.get("models", []):
            if app_label in ("auth", "users"):
                auth_models.append(model)
            elif app_label in ("customers", "vehicles"):
                platform_models.append(model)

    sections = []
    if auth_models:
        sections.append({"name": "Authorization", "app_label": "authorization", "models": auth_models})
    if platform_models:
        sections.append({"name": "Platform", "app_label": "platform", "models": platform_models})

    context["app_list"] = sections
    return context
