import heroAsset from "@/assets/hero-shohimardon.jpg.asset.json";

const heroImg = heroAsset.url;

export function Hero() {
  return (
    <section className="relative h-screen min-h-[720px] w-full overflow-hidden">
      {/* Background image with slow ken-burns */}
      <div className="absolute inset-0 animate-zoom-slow">
        <img
          src={heroImg}
          alt="Shohimardon vodiysidagi yashil tog'lar va musaffo daryo"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/80 via-transparent to-emerald-deep/30" />

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center pt-56 pb-32">
        {/* Top label */}
        <p className="mb-8 text-center text-[11px] uppercase tracking-[0.6em] text-gold animate-fade-in-slow">
          Farg'ona vodiysining yashil yuragi
        </p>
        <h1 className="max-w-5xl font-display font-medium leading-[1.15] text-white text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] animate-fade-up my-0 py-0">
          Shohimardon Dachalari —
          <span className="block italic text-gradient-gold pb-2">Tog' Maskani</span>
        </h1>

        <p
          className="mt-8 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          Shovqindan uzoqlashing.
          <br className="hidden md:block" />
          Shohimardonda dam olish — hayotingizdagi eng unutilmas tajriba. Shohimardon tog' dachalari sizga mukammal tanaffus sovg'a qiladi.
        </p>

        <div
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row animate-fade-up"
          style={{ animationDelay: "0.6s" }}
        >
          <a
            href="/dachas"
            className="group inline-flex items-center justify-center gap-3 rounded-full bg-gold px-9 text-sm font-medium uppercase tracking-[0.2em] text-emerald-deep shadow-glow transition-all hover:scale-[1.03] hover:bg-white py-[16px] my-0"
          >
            Dachalarni ko'rish
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>

    </section>
  );
}
