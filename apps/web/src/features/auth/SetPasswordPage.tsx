import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError, api } from "../../lib/api";

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api<{ ok: true }>("/api/auth/set-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login", { replace: true, state: { passwordSet: true } });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to set your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account setup"
      title="Create your password"
      description="Choose a secure password with at least eight characters to activate your access."
    >
      {!token ? (
        <div className="grid gap-5">
          <p className="rounded-lg border border-danger/20 bg-danger/8 px-3.5 py-3 text-sm leading-6 text-danger">
            This invitation link is incomplete. Request a new invitation from
            your administrator.
          </p>
          <Link
            to="/login"
            className="text-center text-sm font-semibold text-accent hover:text-accent-strong"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
          <Input
            label="New password"
            hint="8+ characters"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
          />
          <Input
            label="Confirm password"
            name="confirmation"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          {error ? (
            <p
              className="rounded-lg border border-danger/20 bg-danger/8 px-3.5 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Setting password…" : "Set password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
