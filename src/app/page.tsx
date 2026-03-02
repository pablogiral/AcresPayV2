import { auth } from "@/auth";
import { MenuCard } from "@/components/menu-card";
import { PublicAuthPanel } from "@/components/public-auth-panel";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const hasGoogleAuth = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasGitHubAuth = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

  if (!session?.user) {
    return <PublicAuthPanel hasGoogleAuth={hasGoogleAuth} hasGitHubAuth={hasGitHubAuth} />;
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
