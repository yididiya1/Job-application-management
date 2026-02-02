import ResumeManager from "@/components/resume-manager/ResumeManager";

export const metadata = {
  title: "Resume Manager",
};

export default function Page() {
  return (
    <main className="h-screen">
      <h1 className="p-4 text-xl font-semibold">Resume Manager</h1>
      <ResumeManager />
    </main>
  );
}
