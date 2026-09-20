const items = [
  {
    name: "Dilnoza Karimova",
    role: "Toshkentdan mehmon",
    quote: "Hayotimda ko'rgan eng go'zal joy. Bolalarim bu sayohatni hech qachon unutmaydi. Shohimardon — bu jannat.",
  },
  {
    name: "Bobur Aliyev",
    role: "Sayohatchi",
    quote: "Apple darajasidagi xizmat, tabiat esa tasvirlab bo'lmas. Har yili bu yerga qaytishni o'zimga so'z berdim.",
  },
  {
    name: "Nigora & Sarvar",
    role: "Asal oyi",
    quote: "Tog' ustidagi infiniti basseyn, gulxan va yulduzli osmon. Romantikaning eng yuksak ta'rifi.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-emerald-deep py-28 text-cream lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-gold">
            Mijozlar fikrlari
          </p>
          <h2 className="mt-6 font-display text-4xl leading-[1.2] md:text-6xl text-white">
            Ular allaqachon
            <span className="italic text-gradient-gold inline-block pb-2"> sevib qolishdi</span>
          </h2>
        </div>

        <div className="mt-20 grid gap-8 lg:grid-cols-3">
          {items.map((t) => (
            <figure key={t.name} className="glass rounded-3xl p-10">
              <div className="text-4xl text-gold leading-none font-display">"</div>
              <blockquote className="mt-4 text-lg leading-relaxed text-white/90 font-display italic">
                {t.quote}
              </blockquote>
              <figcaption className="mt-8 border-t border-white/15 pt-6">
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-xs uppercase tracking-[0.25em] text-gold mt-1">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
