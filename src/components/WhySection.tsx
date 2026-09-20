const features = [
  { icon: "🌬", title: "Toza havo", desc: "Dengiz sathidan 1500m balandda — har nafas yangilik" },
  { icon: "⛰", title: "Tog' manzaralari", desc: "Ko'z ilg'amas yashil cho'qqilar va bulutlar dengizi" },
  { icon: "🌿", title: "Sokin dam", desc: "Shahar shovqinidan butunlay yiroq jannatdek osoyishtalik" },
  { icon: "👨‍👩‍👧", title: "Oilaviy sayohat", desc: "Bolalar va kattalar uchun mukammal makon" },
  { icon: "🏡", title: "Hashamatli dachalar", desc: "Premium darajadagi qulaylik va xizmat" },
  { icon: "🔥", title: "Yozgi sarguzasht", desc: "Gulxan, piyoda sayr, baliq ovi va ko'plab xotiralar" },
];

export function WhySection() {
  return (
    <section id="why" className="relative bg-cream py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-emerald-deep/80">
            Nega Shohimardon
          </p>
          <h2 className="mt-6 font-display text-4xl leading-[1.2] md:text-6xl text-emerald-deep">
            Bu shunchaki dam olish emas —
            <span className="italic text-gradient-gold inline-block pb-2"> bu yangidan tug'ilish</span>
          </h2>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-3xl bg-emerald-tint sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-cream p-10 transition-all duration-700 hover:bg-white"
            >
              <div className="text-4xl">{f.icon}</div>
              <h3 className="mt-6 font-display text-2xl text-emerald-deep">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-700 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
