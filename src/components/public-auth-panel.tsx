"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Props = {
  hasGoogleAuth: boolean;
};

export function PublicAuthPanel({ hasGoogleAuth }: Props) {
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

  async function handleSocialSignIn(provider: "google" | "github") {
    await signIn(provider, { redirectTo: "/" });
  }

  return (
    <section className="hero-grid">
      <div className="card hero-panel">
        <p className="eyebrow">Controla gastos compartidos</p>
        <h1 className="hero-title">Divide, ajusta y liquida sin hojas de cálculo.</h1>
        <p className="hero-copy">
          AcresPay convierte una cuenta caótica en pasos claros: quién estuvo, qué pidió cada uno y quién debe pagar a quién.
        </p>
        <div className="hero-points">
          <span className="metric-pill">Tickets editables</span>
          <span className="metric-pill">Participantes con color</span>
          <span className="metric-pill">Liquidación clara</span>
        </div>
      </div>

      <div className="card auth-card">
        <div>
          <p className="eyebrow">Acceso</p>
          <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Entra a tu espacio</h2>
          <p className="subtle">Usa Google o tu cuenta por email y contraseña.</p>
        </div>

        <div className="auth-actions">
          {hasGoogleAuth ? (
            <button className="btn btn-primary" type="button" onClick={() => void handleSocialSignIn("google")}>
              Entrar con Google
            </button>
          ) : null}
          <Link className="btn" href="/register">Crear cuenta email</Link>
        </div>

        <form onSubmit={handleCredentialsSignIn} className="auth-form">
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
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Entrando..." : "Entrar con email"}
          </button>
        </form>
      </div>
    </section>
  );
}
