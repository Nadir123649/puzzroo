import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/hero";
import { FreeGames } from "@/components/sections/FreeGames";
import { Features } from "@/components/sections/Features";
import { FAQ } from "@/components/sections/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto">
        <Navbar />
        <main className="flex-grow flex flex-col justify-start pb-12">
          <Hero />
          <FreeGames />
          <div className="md:mb-12">
            <Features />
          </div>
          <FAQ />
        </main>
        <Footer />
      </div>
    </div>
  );
}
