export function SiteFooter() {
  return (
    <footer className="relative bg-emerald-deep text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <h3 className="font-display text-3xl text-white">Shohimardon</h3>
          <p className="mt-2 text-xs tracking-[0.4em] text-gold">UZBEKISTAN</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed">
            Tog'lar bag'rida joylashgan sokin maskan. Bu yerda har bir nafas
            toza, har bir manzara unutilmas, har bir kun esa hayotingizning
            eng go'zal xotirasiga aylanadi.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm uppercase tracking-[0.3em] text-gold">Aloqa</h4>
          <ul className="mt-6 space-y-3 text-sm">
            <li>+998 99 990 11 59</li>
            <li>@AminjonSaidovich</li>
            <li>Shohimardon, Farg'ona viloyati</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm uppercase tracking-[0.3em] text-gold">Ijtimoiy</h4>
          <ul className="mt-6 space-y-3 text-sm">
            <li><a href="https://www.instagram.com/soyboyi_shohimardon?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" className="hover:text-gold transition">Instagram</a></li>
            <li><a href="https://t.me/AminjonSaidovich" className="hover:text-gold transition">Telegram</a></li>
            <li><a href="https://youtube.com/channel/UCtZZhr951awJ7aLeIeLQwBg" className="hover:text-gold transition">YouTube</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-cream/80 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>© {new Date().getFullYear()} Shohimardon Valley. Barcha huquqlar himoyalangan.</p>
          <p className="tracking-[0.3em] uppercase">Tabiat bag'ridagi hashamat</p>
        </div>
      </div>
    </footer>
  );
}
