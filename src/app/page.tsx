import { AppLayout } from "@/components/layout/AppLayout";
import { Hero } from "@/components/sections/hero";
import { FreeGames } from "@/components/sections/FreeGames";
import { Features } from "@/components/sections/Features";
import { EarlyLegends } from "@/components/sections/EarlyLegends";
import { FAQ } from "@/components/sections/FAQ";
import { AboutPuzzroo } from "@/components/sections/AboutPuzzroo";

export default function Home() {
  return (
    <AppLayout>
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[px]">
        <Hero />
        <FreeGames />
        <div className="md:mb-12">
          <Features />
        </div>
        <EarlyLegends />
        <FAQ />
        <AboutPuzzroo />
      </div>
    </AppLayout>
  );
}
