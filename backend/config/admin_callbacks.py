"""
Admin dashboard callback: group app_list to match SIDEBAR (Authorization, Platform).
Central blocks and titles then match the left sidebar.
"""


def dashboard_callback(request, context):
    app_list = context.get("app_list") or []
    if not isinstance(app_list, list):
        return context
    auth_models = []
    platform_models = []

    for app in app_list:
        if not isinstance(app, dict):
            continue
        app_label = app.get("app_label", "")
        models = app.get("models") or []
        for model in models:
            if not isinstance(model, dict):
                continue
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
