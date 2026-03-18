import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail]           = useState("admin@autoservice.local");
  const [password, setPassword]     = useState("admin12345");
  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password });
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/app";
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Unable to sign in. Check credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">

        {/* Logo mark */}
        <div className="login-logo">
          <span>CS</span>
        </div>

        {/* Header */}
        <div className="login-header">
          <p className="eyebrow">Staff Access</p>
          <h1>Car Service Platform</h1>
          <p className="login-copy">
            Sign in to the internal workspace. Client access is handled through a separate portal.
          </p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="button login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer note */}
        <p className="login-footer">
          For client portal access, use the unique link sent to you by the service team.
        </p>
      </div>
    </div>
  );
}
