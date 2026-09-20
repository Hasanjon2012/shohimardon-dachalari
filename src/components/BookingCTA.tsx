import mist from "@/assets/gallery-mist.jpg";

export function BookingCTA() {
  return (
    <section id="book" className="relative overflow-hidden py-32 lg:py-44">
      <div className="absolute inset-0">
        <img src={mist} alt="" loading="lazy" width={1280} height={1600}
             className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-cream/85" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-10">
        <p className="text-[11px] uppercase tracking-[0.5em] text-emerald-deep/80">
          Sizning sayohatingiz boshlanmoqda
        </p>
        <h2 className="mt-6 font-display text-5xl leading-[1.15] text-emerald-deep md:text-7xl">
          Tog'lar sizni
          <span className="block italic text-gradient-gold pb-2">kutmoqda.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-emerald-deep/75">
          Hozir band qiling — bo'sh dachalarimiz tezda tugab qoladi.
          Bu yozni hayotingizning eng yorqin xotirasiga aylantiring.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="tel:+998999901159"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-deep px-10 py-4 text-sm uppercase tracking-[0.2em] text-cream shadow-luxe transition-all hover:scale-[1.03] hover:bg-gold hover:text-emerald-deep"
          >
            +998 99 990 11 59
          </a>
          <a
            href="#dachas"
            className="inline-flex items-center justify-center rounded-full border border-emerald-deep/30 px-10 py-4 text-sm uppercase tracking-[0.2em] text-emerald-deep transition-all hover:bg-emerald-deep hover:text-cream"
          >
            Dachalarni tanlash
          </a>
        </div>
      </div>
    </section>
  );
}
