import Link from "next/link";
import { OfferPipeline } from "@/components/offers/OfferPipeline";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white text-black">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            visualoffer
          </Link>
          <Button asChild variant="outline" className="h-9 px-4">
            <Link href="/anonymize">Anonymizer</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6 md:py-14">
        <OfferPipeline />
      </main>
    </div>
  );
}
