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

    await signIn("credentials", { email, password, redirectTo: "/" });
  };

  return (
    <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Crear cuenta</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.8rem" }}>
        <input className="input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Contraseña (mínimo 8)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creando..." : "Crear y entrar"}
        </button>
      </form>
    </section>
  );
}
