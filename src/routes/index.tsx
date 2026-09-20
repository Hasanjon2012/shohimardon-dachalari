import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { WhySection } from "@/components/WhySection";
import { DachasSection } from "@/components/DachasSection";
import { EmotionalBreak } from "@/components/EmotionalBreak";
import { GallerySection } from "@/components/GallerySection";
import { BookingCTA } from "@/components/BookingCTA";
import { FeedbackSection } from "@/components/FeedbackSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shohimardon Dachalari — Tog' Maskani" },
      {
        name: "description",
        content:
          "Shohimardonda dacha ijarasi. Tog' havosi, toza tabiat, oilaviy dam olish. Shohimardon dachalari — qulay narxlar va premium xizmat.",
      },
      { property: "og:title", content: "Shohimardon Dachalari Ijarasi — Tog'da Dam Olish" },
      {
        property: "og:description",
        content:
          "Shohimardonda dacha ijarasi. Tog' havosi, toza tabiat, oilaviy dam olish. Shohimardon dachalari — qulay narxlar va premium xizmat.",
      },
      { property: "og:url", content: "https://shohimardon.site/" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b3c3289-5efa-416a-947e-48b2c940ab83/id-preview-cd9177cd--5afc4c63-2781-40d7-816a-96a426d8bdd7.lovable.app-1778562174214.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b3c3289-5efa-416a-947e-48b2c940ab83/id-preview-cd9177cd--5afc4c63-2781-40d7-816a-96a426d8bdd7.lovable.app-1778562174214.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://shohimardon.site/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <WhySection />
        <DachasSection />
        <EmotionalBreak />
        <GallerySection />
        <BookingCTA />
        <FeedbackSection />
      </main>
      <SiteFooter />
    </div>
  );
}
