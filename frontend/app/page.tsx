export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          OfferCheck
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Upload your résumé and get specialized feedback for software
          developer roles at big tech companies.
        </p>
      </main>
    </div>
  );
}
