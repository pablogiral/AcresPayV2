"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Props = {
  hasGoogleAuth: boolean;
  hasGitHubAuth: boolean;
};

export function PublicAuthPanel({ hasGoogleAuth, hasGitHubAuth }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialsSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <section className="card" style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ marginTop: 0, fontSize: "2rem" }}>AcresPay</h1>
      <p style={{ color: "#475569" }}>Divide cuentas de forma fácil</p>

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
        {hasGoogleAuth ? <Link className="btn btn-primary" href="/api/auth/signin/google">Entrar con Google</Link> : null}
        {hasGitHubAuth ? <Link className="btn" href="/api/auth/signin/github">Entrar con GitHub</Link> : null}
        <Link className="btn" href="/register">Crear cuenta email</Link>
      </div>

      <form onSubmit={handleCredentialsSignIn} style={{ display: "grid", gap: "0.8rem", maxWidth: 420, margin: "1.25rem auto 0" }}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Entrando..." : "Entrar con email"}
        </button>
      </form>
    </section>
  );
}
