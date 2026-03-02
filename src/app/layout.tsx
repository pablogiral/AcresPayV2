import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AcresPay",
  description: "Divide cuentas de forma fácil"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);

  return (
    <html lang="es">
      <body>
        <header className="container" style={{ paddingTop: "1rem", paddingBottom: "1rem" }}>
          <div className="card" style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              AcresPay
            </Link>

            {session?.user ? (
              <nav style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Link className="btn" href="/friends">Amigos</Link>
                <Link className="btn" href="/my-bills">Mis Tickets</Link>
                <Link className="btn" href="/combine-tickets">Combinar</Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="btn" type="submit">Salir</button>
                </form>
              </nav>
            ) : null}
          </div>
        </header>

        <main className="container" style={{ paddingBottom: "2rem" }}>{children}</main>
      </body>
    </html>
  );
}
