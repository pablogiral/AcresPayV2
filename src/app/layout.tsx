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
        <header className="site-shell">
          <div className="container" style={{ paddingTop: "1rem", paddingBottom: "1rem" }}>
            <div className="app-header">
              <Link href="/" className="brand-lockup">
                <span className="brand-mark">A</span>
                <span>
                  <strong>AcresPay</strong>
                  <span className="brand-subtitle">Split bills without chaos</span>
                </span>
              </Link>

              {session?.user ? (
                <nav className="nav-cluster">
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
          </div>
        </header>

        <main className="container" style={{ paddingBottom: "2.5rem" }}>{children}</main>
      </body>
    </html>
  );
}
