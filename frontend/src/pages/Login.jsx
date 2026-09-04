import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Button, Input } from "../components/Form";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to log in. Please check your credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Log in to your account" subtitle="Access the incident response platform.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-md border border-state-danger/30 bg-state-danger/10 px-3 py-2 text-sm text-severity-critical">{error}</p>}
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>

      <div className="mt-6 rounded-md border border-hairline bg-panel px-3.5 py-3 text-xs text-ink-muted">
        <p className="mb-1.5 font-medium text-ink">Demo accounts</p>
        <p>admin@example.com / AdminDemo123!</p>
        <p>analyst@example.com / AnalystDemo123!</p>
        <p>developer@example.com / DeveloperDemo123!</p>
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-signal hover:text-signal-bright">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
