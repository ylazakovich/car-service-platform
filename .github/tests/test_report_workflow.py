"""
Tests for .github/workflows/report.yml

This PR removed the "Commit pyramid snapshot (upstream branches only)" step that
used to push snapshot files directly to the branch after each PR Pipeline run.
These tests verify the workflow structure reflects that removal and remains correct.
"""

import pathlib
import re

import pytest
import yaml

WORKFLOW_PATH = pathlib.Path(__file__).parents[1] / "workflows" / "report.yml"


@pytest.fixture(scope="module")
def workflow() -> dict:
    """Parse report.yml once for all tests in this module."""
    return yaml.safe_load(WORKFLOW_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def workflow_text() -> str:
    """Raw text of report.yml for pattern-based assertions."""
    return WORKFLOW_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def steps(workflow) -> list:
    """Flat list of step dicts from the test-report job."""
    return workflow["jobs"]["test-report"]["steps"]


@pytest.fixture(scope="module")
def step_names(steps) -> list[str]:
    """Names of all steps (steps without a 'name' key are excluded)."""
    return [s["name"] for s in steps if "name" in s]


# ---------------------------------------------------------------------------
# Basic YAML integrity
# ---------------------------------------------------------------------------


class TestYamlIntegrity:
    def test_file_exists(self):
        assert WORKFLOW_PATH.exists(), "report.yml must exist"

    def test_file_is_valid_yaml(self):
        """File must parse without errors."""
        content = WORKFLOW_PATH.read_text(encoding="utf-8")
        parsed = yaml.safe_load(content)
        assert parsed is not None

    def test_top_level_keys(self, workflow):
        # PyYAML parses the GitHub Actions "on:" key as Python True (YAML boolean).
        assert "name" in workflow
        assert True in workflow  # "on:" → True in PyYAML
        assert "jobs" in workflow

    def test_workflow_name(self, workflow):
        assert workflow["name"] == "Test Report"

    def test_has_single_job(self, workflow):
        assert "test-report" in workflow["jobs"]


# ---------------------------------------------------------------------------
# Removed step: "Commit pyramid snapshot" must NOT be present
# ---------------------------------------------------------------------------


class TestCommitPyramidStepRemoved:
    """The PR removed the step that committed & pushed snapshot files to the branch.
    All assertions here confirm that removal is complete and no remnants remain."""

    def test_commit_pyramid_step_absent_by_name(self, step_names):
        """The named step must not appear in the steps list."""
        for name in step_names:
            assert "Commit pyramid snapshot" not in name, (
                f"Step '{name}' looks like the removed commit-pyramid step"
            )

    def test_no_git_push_pyramid_in_steps(self, steps):
        """No step should push HEAD to a branch for the pyramid snapshot."""
        pattern = re.compile(r"git push origin.*refs/heads/")
        for step in steps:
            run_block = step.get("run", "")
            assert not pattern.search(run_block), (
                f"Step '{step.get('name', '<unnamed>')}' contains a git push to a branch, "
                "which belonged to the removed commit-pyramid step"
            )

    def test_no_git_commit_for_pyramid_snapshot_in_steps(self, steps):
        """No step should contain a git commit for the pyramid snapshot."""
        phrase = "chore(ci): refresh test pyramid snapshot"
        for step in steps:
            run_block = step.get("run", "")
            assert phrase not in run_block, (
                f"Step '{step.get('name', '<unnamed>')}' still references the "
                "removed commit message for the pyramid snapshot"
            )

    def test_no_git_add_snapshot_files_in_steps(self, steps):
        """No step should stage the pyramid snapshot files via git add.
        Note: other steps may legitimately *write* these files; we only forbid
        git-add (i.e. staging for commit)."""
        git_add_pattern = re.compile(r"git add\b.*pyramid-snapshot")
        for step in steps:
            run_block = step.get("run", "")
            assert not git_add_pattern.search(run_block), (
                f"Step '{step.get('name', '<unnamed>')}' still runs 'git add' on "
                "pyramid snapshot files — remove was incomplete"
            )

    def test_no_git_config_bot_identity_in_steps(self, steps):
        """The bot git identity config belonged exclusively to the removed step;
        it must not appear in any remaining step."""
        bot_email = "41898282+github-actions[bot]@users.noreply.github.com"
        for step in steps:
            run_block = step.get("run", "")
            assert bot_email not in run_block, (
                f"Step '{step.get('name', '<unnamed>')}' still configures the bot "
                "git identity — a remnant of the removed commit-pyramid step"
            )

    def test_branch_env_var_not_used_for_push(self, steps):
        """The BRANCH env var was used only to push HEAD:refs/heads/$BRANCH.
        No remaining step should reference that pattern."""
        push_pattern = re.compile(r'HEAD:refs/heads/\$\{?BRANCH\}?')
        for step in steps:
            run_block = step.get("run", "")
            assert not push_pattern.search(run_block), (
                f"Step '{step.get('name', '<unnamed>')}' still uses the BRANCH "
                "push-to-branch pattern from the removed step"
            )

    def test_commit_pyramid_step_absent_from_raw_text(self, workflow_text):
        """Belt-and-suspenders: the step name must not appear anywhere in the file."""
        assert "Commit pyramid snapshot" not in workflow_text

    def test_continue_on_error_git_push_block_absent(self, workflow_text):
        """The removed step set continue-on-error together with a git push.
        Confirm the combination is gone (raw-text guard)."""
        # The removed step was the only one combining continue-on-error with git push
        has_continue = "continue-on-error: true" in workflow_text
        has_git_push_branch = bool(re.search(r"git push origin.*refs/heads/", workflow_text))
        # Either both are gone, or git push to a branch is definitely gone
        assert not has_git_push_branch, (
            "A 'git push origin HEAD:refs/heads/' line still exists in the workflow"
        )


# ---------------------------------------------------------------------------
# Surrounding steps still present (regression guard)
# ---------------------------------------------------------------------------


class TestSurroundingStepsPreserved:
    """Confirm the steps directly adjacent to the removed step were not accidentally
    removed along with it."""

    def test_upload_pyramid_snapshot_artifact_present(self, step_names):
        assert "Upload pyramid snapshot artifact" in step_names, (
            "The 'Upload pyramid snapshot artifact' step must still exist"
        )

    def test_deploy_allure_html_to_github_pages_present(self, step_names):
        assert "Deploy Allure HTML to GitHub Pages" in step_names, (
            "The 'Deploy Allure HTML to GitHub Pages' step must still exist"
        )

    def test_export_test_pyramid_snapshot_present(self, step_names):
        assert "Export test pyramid snapshot (Allure epics)" in step_names, (
            "The 'Export test pyramid snapshot' step must still exist"
        )

    def test_quality_gates_step_present(self, step_names):
        assert "Quality gates — test pyramid (advisory warnings only)" in step_names, (
            "The 'Quality gates' step must still exist"
        )

    def test_mirror_pr_pipeline_conclusion_present(self, step_names):
        """The last step that mirrors the PR Pipeline exit code must be intact."""
        assert "Mirror PR Pipeline conclusion" in step_names


# ---------------------------------------------------------------------------
# Workflow trigger and permissions
# ---------------------------------------------------------------------------


class TestWorkflowTriggerAndPermissions:
    def test_trigger_is_workflow_run(self, workflow):
        # PyYAML parses "on:" as Python True; access triggers via True key.
        triggers = workflow[True]
        assert "workflow_run" in triggers

    def test_trigger_workflow_name(self, workflow):
        wf_run = workflow[True]["workflow_run"]
        assert "PR Pipeline" in wf_run["workflows"]

    def test_trigger_types_completed(self, workflow):
        wf_run = workflow[True]["workflow_run"]
        assert "completed" in wf_run["types"]

    def test_permissions_contents_write(self, workflow):
        """Workflow needs write access to deploy gh-pages."""
        assert workflow["permissions"]["contents"] == "write"

    def test_permissions_pull_requests_write(self, workflow):
        """Workflow needs write access to post PR comments."""
        assert workflow["permissions"]["pull-requests"] == "write"

    def test_job_runs_on_ubuntu(self, workflow):
        assert workflow["jobs"]["test-report"]["runs-on"] == "ubuntu-latest"

    def test_job_condition_excludes_cancelled(self, workflow):
        """Workflow must not process cancelled PR Pipeline runs."""
        job_if = workflow["jobs"]["test-report"]["if"]
        assert "cancelled" in str(job_if)

    def test_concurrency_cancel_in_progress(self, workflow):
        """Only one report should run per branch at a time."""
        assert workflow["concurrency"]["cancel-in-progress"] is True


# ---------------------------------------------------------------------------
# Ordering guard: upload artifact precedes deploy to pages
# ---------------------------------------------------------------------------


class TestStepOrdering:
    def test_upload_artifact_before_deploy_pages(self, step_names):
        """Pyramid artifact upload must happen before GitHub Pages deploy."""
        upload_idx = step_names.index("Upload pyramid snapshot artifact")
        deploy_idx = step_names.index("Deploy Allure HTML to GitHub Pages")
        assert upload_idx < deploy_idx, (
            "Upload pyramid snapshot artifact must precede Deploy Allure HTML to GitHub Pages"
        )

    def test_export_before_upload_artifact(self, step_names):
        """Snapshot must be generated before it is uploaded."""
        export_idx = step_names.index("Export test pyramid snapshot (Allure epics)")
        upload_idx = step_names.index("Upload pyramid snapshot artifact")
        assert export_idx < upload_idx

    def test_mirror_conclusion_is_last_step(self, step_names):
        """Mirror PR Pipeline conclusion must be the final step."""
        assert step_names[-1] == "Mirror PR Pipeline conclusion"
