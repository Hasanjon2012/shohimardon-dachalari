import sunsetAsset from "@/assets/emotional-snow.jpg.asset.json";

const sunset = sunsetAsset.url;

export function EmotionalBreak() {
  return (
    <section className="relative h-[80vh] min-h-[560px] w-full overflow-hidden">
      <div className="absolute inset-0 animate-zoom-slow">
        <img
          src={sunset}
          alt="Shohimardon tog' cho'qqilari ustidagi oltin quyosh botishi"
          loading="lazy"
          width={1600}
          height={1200}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-deep/80 via-emerald-deep/40 to-transparent" />

      <div className="relative z-10 flex h-full items-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.5em] text-gold">
              Bir lahzaga to'xtang
            </p>
            <h2 className="mt-6 font-display text-4xl leading-[1.2] text-white md:text-6xl lg:text-7xl">
              Bir necha kunlik dam olish
              <span className="block italic text-gradient-gold py-2">butun kayfiyatingizni</span>
              o'zgartiradi.
            </h2>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-white/80">
              Shahar charchog'idan qoching. Tog'lar nafasidan to'yib oling.
              Shohimardon sizni kutmoqda.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
