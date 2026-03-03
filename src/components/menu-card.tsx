import Link from "next/link";

export function MenuCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card feature-card" style={{ display: "block" }}>
      <div className="feature-kicker">Acción</div>
      <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>{title}</h3>
      <p className="subtle" style={{ margin: 0 }}>{description}</p>
      <span className="feature-link">Abrir</span>
    </Link>
  );
}
