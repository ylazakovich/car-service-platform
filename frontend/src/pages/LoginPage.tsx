import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [accessCode, setAccessCode]     = useState("");
  const [codeError, setCodeError]       = useState("");

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

  function handlePortalAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = accessCode.trim();
    if (!code) {
      setCodeError("Please enter your access code.");
      return;
    }
    navigate(`/portal/${encodeURIComponent(code)}`);
  }

  function enterClientMode() {
    setIsClientMode(true);
  }

  function exitClientMode() {
    setIsClientMode(false);
    setAccessCode("");
    setCodeError("");
  }

  return (
    <div className="login-shell">
      <div className="login-card-scene">
        <div className={`login-card-flipper${isClientMode ? " is-flipped" : ""}`}>

          {/* Front — Staff Login */}
          <div className="login-card login-card-face login-card-front">
            <BrandMark variant="auth" />

            <div className="login-header">
              <p className="eyebrow">Staff Access</p>
              <h1>Car Service Platform</h1>
              <p className="login-copy">
                Sign in to the internal workspace. Client access is handled through a separate portal.
              </p>
            </div>

            <form className="login-form form--cozy" onSubmit={handleSubmit}>
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

            <div className="login-footer">
              <button type="button" className="client-toggle-btn" onClick={enterClientMode}>
                Are you a client?
              </button>
            </div>
          </div>

          {/* Back — Client Portal */}
          <div
            className="login-card login-card-face login-card-back"
            aria-hidden={!isClientMode}
          >
            <BrandMark variant="auth" />

            <div className="login-header">
              <p className="eyebrow">Client Portal</p>
              <h1>Track Your Repair</h1>
              <p className="login-copy">
                Enter the access code provided by our service team to view your repair status, photos, and documents.
              </p>
            </div>

            <form className="login-form form--cozy" onSubmit={handlePortalAccess}>
              <label>
                <span>Access Code</span>
                <input
                  value={accessCode}
                  onChange={(e) => { setAccessCode(e.target.value); setCodeError(""); }}
                  type="text"
                  autoComplete="off"
                  placeholder="Your unique access code"
                  tabIndex={isClientMode ? 0 : -1}
                />
              </label>

              {codeError ? <p className="form-error">{codeError}</p> : null}

              <button
                type="submit"
                className="button login-submit"
                tabIndex={isClientMode ? 0 : -1}
              >
                View Repair Status
              </button>
            </form>

            <div className="login-footer">
              <button
                type="button"
                className="client-toggle-btn"
                onClick={exitClientMode}
                tabIndex={isClientMode ? 0 : -1}
              >
                ← Back to staff login
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
