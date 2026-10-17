import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  authors: [{ name: "Azantor", url: "https://azantor.xyz" }],
  creator: "Azantor",
  openGraph: { siteName: "Mentora", type: "website" },
  title: { default: "Mentora — Find trainers, coaches, consultants and speakers", template: "%s · Mentora" },
  description: "Book vetted trainers, facilitators, coaches, consultants and keynote speakers. Paid workshops, AI for Leaders, and verifiable certificates.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="site">
          <div className="wrap nav">
            <Link className="logo" href="/">
              Mentora
            </Link>
            <nav className="links" aria-label="Main">
              <Link href="/experts">Find experts</Link>
              <Link href="/speakers">Speakers</Link>
              <Link href="/workshops">Workshops</Link>
              <Link href="/ai-for-leaders">AI for Leaders</Link>
              <Link href="/verify">Verify certificate</Link>
              <Link href="/pricing">Pricing</Link>
            </nav>
            <div className="tools">
              {user ? (
                <>
                  <Link className="btn btn-primary btn-sm" href="/dashboard">
                    Dashboard
                  </Link>
                  <Link className="btn btn-ghost btn-sm" href="/api/auth/signout">
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost btn-sm" href="/login">
                    Sign in
                  </Link>
                  <Link className="btn btn-primary btn-sm" href="/signup">
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="wrap" id="main">
          {children}
        </main>
        <footer className="site">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Mentora · Learning &amp; leadership marketplace</span>
            <span>
              <Link href="/pricing">Pricing</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/refunds">Refunds</Link> · <Link href="/signup?type=expert">Become an expert</Link>
            </span>
            <span>
              Developed by{" "}
              <a className="lnk" href="https://azantor.xyz" rel="noopener" target="_blank">
                Azantor
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
