import "./globals.css";
import "react-mde/lib/styles/css/react-mde-all.css";
import "@toast-ui/editor/dist/toastui-editor.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Job Tracker MVP",
  description: "Resume editor + JD tailoring MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
            <div className="text-sm font-semibold">Job Application Tracker</div>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Home
              </Link>
              <Link
                href="/editor"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Resume Editor
              </Link>
              <Link
                href="/jobs"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Job Tracker
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl">{children}</main>
      </body>
    </html>
  );
}
