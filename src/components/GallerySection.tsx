import img1 from "@/assets/gallery-1.jpg.asset.json";
import img2 from "@/assets/gallery-2.jpg.asset.json";
import img3 from "@/assets/gallery-3.jpg.asset.json";
import img4 from "@/assets/gallery-4.jpg.asset.json";
import img5 from "@/assets/gallery-5.jpg.asset.json";

export function GallerySection() {
  return (
    <section id="gallery" className="bg-cream py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-emerald-deep/80">
            Galereya
          </p>
          <h2 className="mt-6 font-display text-4xl leading-[1.2] md:text-6xl text-emerald-deep">
            Bir marta ko'rgan,
            <span className="italic text-gradient-gold inline-block pb-2"> umrbod sevib qoladi</span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-12 grid-rows-2 gap-4 auto-rows-fr">
          <div className="col-span-12 md:col-span-6 md:row-span-2 overflow-hidden rounded-3xl">
            <img src={img1.url} alt="Shohimardon qishki tog'lari va qorli daryo" loading="lazy"
                 className="h-full min-h-72 w-full object-cover transition-transform duration-[2500ms] hover:scale-110" />
          </div>
          <div className="col-span-6 md:col-span-3 overflow-hidden rounded-3xl">
            <img src={img2.url} alt="Tog'lar orasidagi quyosh botishi" loading="lazy"
                 className="h-full min-h-56 w-full object-cover transition-transform duration-[2500ms] hover:scale-110" />
          </div>
          <div className="col-span-6 md:col-span-3 overflow-hidden rounded-3xl">
            <img src={img3.url} alt="Oltin tusli kuzgi daraxtlar" loading="lazy"
                 className="h-full min-h-56 w-full object-cover transition-transform duration-[2500ms] hover:scale-110" />
          </div>
          <div className="col-span-6 md:col-span-3 overflow-hidden rounded-3xl">
            <img src={img4.url} alt="Tog' cho'qqilaridan manzara" loading="lazy"
                 className="h-full min-h-56 w-full object-cover transition-transform duration-[2500ms] hover:scale-110" />
          </div>
          <div className="col-span-6 md:col-span-3 overflow-hidden rounded-3xl">
            <img src={img5.url} alt="Shohimardon qoyalari" loading="lazy"
                 className="h-full min-h-56 w-full object-cover transition-transform duration-[2500ms] hover:scale-110" />
          </div>
        </div>
      </div>
    </section>
  );
}
