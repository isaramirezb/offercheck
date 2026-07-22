import UploadForm from "./components/UploadForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <main className="flex w-full max-w-xl flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="text-xs text-[#005500] tracking-widest uppercase">
            &gt; system initialized
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#00ff41] [text-shadow:0_0_20px_#00ff41,0_0_40px_#00b300]">
            OfferCheck
          </h1>
          <p className="text-sm text-[#00b300] leading-relaxed">
            Upload your resume. Get AI-powered feedback specialized for<br />
            software engineer roles at big tech companies.
          </p>
        </div>

        <UploadForm />

        <div className="text-xs text-[#003300]">
          &gt; ready_
        </div>
      </main>
    </div>
  );
}
