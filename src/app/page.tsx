import { EmailAgent } from "@/components/email-agent";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-24">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 sm:px-8 lg:px-12">
        <EmailAgent />
      </main>
    </div>
  );
}
