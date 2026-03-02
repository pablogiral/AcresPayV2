import Link from "next/link";
import { auth } from "@/auth";
import { MenuCard } from "@/components/menu-card";

export default async function HomePage() {
  const session = await auth();
  const hasGoogleAuth = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasGitHubAuth = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

  if (!session?.user) {
    return (
      <section className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h1 style={{ marginTop: 0, fontSize: "2rem" }}>AcresPay</h1>
        <p style={{ color: "#475569" }}>Divide cuentas de forma fácil</p>

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
          {hasGoogleAuth ? <Link className="btn btn-primary" href="/api/auth/signin/google">Entrar con Google</Link> : null}
          {hasGitHubAuth ? <Link className="btn" href="/api/auth/signin/github">Entrar con GitHub</Link> : null}
          <Link className="btn" href="/register">Crear cuenta email</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Hola, {session.user.name ?? ""}</h1>
      <p style={{ color: "#64748b" }}>Elige una acción para continuar.</p>

      <div className="grid-auto" style={{ marginTop: "1rem" }}>
        <MenuCard href="/bill/new" title="Nuevo Ticket" description="Crea una cuenta y añade consumos." />
        <MenuCard href="/friends" title="Amigos" description="Gestiona tu lista de participantes frecuentes." />
        <MenuCard href="/my-bills" title="Mis Tickets" description="Revisa y continúa tickets anteriores." />
        <MenuCard href="/combine-tickets" title="Combinar Tickets" description="Optimiza transferencias entre varios tickets." />
      </div>
    </section>
  );
}
