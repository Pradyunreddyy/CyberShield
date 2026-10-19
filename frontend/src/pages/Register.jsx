import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Button, Input, PasswordInput } from "../components/Form";
import { ErrorState } from "../components/Primitives";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../api/client";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to register. Please check your details."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create a developer account" subtitle="New accounts start with developer access; an admin can grant analyst or admin roles.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorState message={error} />}
        <Input label="Full name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dana Developer" />
        <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <PasswordInput
          label="Password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" className="rounded font-medium text-signal hover:text-signal-bright">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
