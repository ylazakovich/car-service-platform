import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvite } from "../api/users";

type PageState = "form" | "success" | "error";

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pageState, setPageState]         = useState<PageState>("form");
  const [error, setError]                 = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvite(token, password);
      setPageState("success");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const detail = axiosError.response?.data?.detail;
      setError(detail ?? "Invalid or expired invite link.");
      setPageState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">

        <div className="login-logo">
          <span>CS</span>
        </div>

        <div className="login-header">
          <p className="eyebrow">Account Setup</p>
          <h1>Set Your Password</h1>
          <p className="login-copy">
            Create a password for your account to get started.
          </p>
        </div>

        {pageState === "success" ? (
          <div className="invite-success">
            <p className="invite-success-text">You&apos;re all set! Your password has been set.</p>
            <button
              type="button"
              className="button login-submit"
              onClick={() => navigate("/login")}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label>
              <span>Confirm Password</span>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Setting password…" : "Set Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
