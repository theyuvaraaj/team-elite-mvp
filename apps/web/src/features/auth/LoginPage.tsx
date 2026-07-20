import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { postLoginPath } from "../../app/paths";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import { useAuth } from "./useAuth";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string; passwordSet?: boolean } | null)
    ?.from;

  if (user) {
    return <Navigate to={postLoginPath(user.role, from)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(email, password);
      navigate(postLoginPath(authenticatedUser.role, from), { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const successMessage =
    (location.state as { passwordSet?: boolean } | null)?.passwordSet === true;

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Use your Team Elite credentials to continue to your assigned portal."
    >
      {successMessage ? (
        <div
          className="mb-5 rounded-lg border border-success/25 bg-success/8 px-3.5 py-3 text-sm text-success"
          role="status"
        >
          Password set successfully. You can now sign in.
        </div>
      ) : null}
      <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@teamelite.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
