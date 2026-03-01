import Link from "next/link";

export function MenuCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card" style={{ display: "block" }}>
      <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>{title}</h3>
      <p style={{ margin: 0, color: "#64748b" }}>{description}</p>
    </Link>
  );
}
