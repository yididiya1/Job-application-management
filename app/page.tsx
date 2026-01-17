
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4 border-b pb-4">
          <div className="text-lg font-semibold">Job Application Tracker</div>
        </header>

        <section className="space-y-3">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-neutral-600">
            This platform is used to manage your job search end-to-end: track
            applications, tailor your resume to job descriptions, and stay
            organized across pipelines.
          </p>
          <p className="text-neutral-600">
            Use the tabs above to jump into the resume editor or the Trello-like
            job board.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/editor"
            className="rounded-lg border p-4 hover:bg-neutral-50"
          >
            <div className="font-semibold">Resume Editor</div>
            <div className="mt-1 text-sm text-neutral-600">
              Paste a job description and generate suggested LaTeX block updates.
            </div>
          </Link>

          <Link
            href="/jobs"
            className="rounded-lg border p-4 hover:bg-neutral-50"
          >
            <div className="font-semibold">Job Tracker</div>
            <div className="mt-1 text-sm text-neutral-600">
              Organize applications in a kanban board (and list view).
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
