import MatchIdInput from "@/components/MatchIdInput";
import RecentAnalyses from "@/components/RecentAnalyses";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center pt-24 pb-16 px-6 bg-gradient-to-b from-[var(--accent-glow)] to-transparent">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 text-center">
          <span className="text-[var(--accent)]">Dota</span>Genius
        </h1>
        <p className="text-lg text-[var(--muted)] text-center max-w-md mb-10 leading-relaxed">
          Get AI-powered analysis of your Dota 2 matches. Enter a Match ID to
          see what went right, what went wrong, and how to improve.
        </p>
        <MatchIdInput />
      </section>

      {/* Recent Analyses */}
      <section className="w-full flex flex-col items-center px-6 pb-20">
        <RecentAnalyses />
      </section>
    </div>
  );
}
