export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          DotaGenius
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center max-w-md">
          Analyze your Dota 2 replays and get actionable insights about your
          gameplay.
        </p>
      </main>
    </div>
  );
}
