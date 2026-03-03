import { auth } from "@/auth";
import { MenuCard } from "@/components/menu-card";
import { PublicAuthPanel } from "@/components/public-auth-panel";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const hasGoogleAuth = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  if (!session?.user) {
    return <PublicAuthPanel hasGoogleAuth={hasGoogleAuth} />;
  }

  return (
    <section className="page-stack">
      <div className="card card-hero">
        <p className="eyebrow">Panel principal</p>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Hola, {session.user.name ?? ""}</h1>
        <p className="subtle">Empieza un ticket nuevo o retoma uno existente sin perder el contexto.</p>
      </div>

      <div className="grid-auto" style={{ marginTop: "0.25rem" }}>
        <MenuCard href="/bill/new" title="Nuevo Ticket" description="Crea una cuenta y añade consumos." />
        <MenuCard href="/friends" title="Amigos" description="Gestiona tu lista de participantes frecuentes." />
        <MenuCard href="/my-bills" title="Mis Tickets" description="Revisa y continúa tickets anteriores." />
        <MenuCard href="/combine-tickets" title="Combinar Tickets" description="Optimiza transferencias entre varios tickets." />
      </div>
    </section>
  );
}
