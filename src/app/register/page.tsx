"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "No se pudo crear la cuenta");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("La cuenta se creó, pero no se pudo iniciar sesión");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  };

  return (
    <section className="hero-grid hero-grid-single">
      <div className="card auth-card" style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <div>
          <p className="eyebrow">Alta</p>
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Crear cuenta</h1>
          <p className="subtle">Empieza con email y contraseña. Después podrás seguir usando Google si quieres.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
        <input className="input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Contraseña (mínimo 8)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creando..." : "Crear y entrar"}
        </button>
        </form>
      </div>
    </section>
  );
}
