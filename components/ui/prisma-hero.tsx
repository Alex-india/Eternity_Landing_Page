import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em] text-blue-500">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero Props ---------------- */
export interface PrismaHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  videoSrc?: string;
  posterSrc?: string;
  navItems?: { label: string; href: string }[];
}

const defaultNavItems = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

const PrismaHero = ({
  title = "Eternity",
  subtitle = "We build digital solutions that power businesses everywhere. Full Stack, Cross Platform, Scalable, Secure. From idea to deployment.",
  ctaText = "Start Your Project",
  ctaHref = "#contact",
  videoSrc = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4",
  posterSrc = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop",
  navItems = defaultNavItems,
}: PrismaHeroProps) => {
  return (
    <section className="h-screen w-full p-2 sm:p-4 md:p-6 lg:p-8" id="home">
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 md:rounded-[2rem] shadow-2xl bg-[#0A0F1E]">
        
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={posterSrc}
          className="absolute inset-0 h-full w-full object-cover brightness-[0.75]"
          src={videoSrc}
        />

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#0A0F1E]/90" />

        {/* Navbar pill */}
        <nav className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/70 backdrop-blur-md px-5 py-2.5 sm:gap-6 md:gap-8 md:px-8 shadow-lg">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[11px] font-medium transition-colors sm:text-xs md:text-sm text-[#E1E0CC]/80 hover:text-[#E1E0CC]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 sm:px-8 md:px-12 lg:pb-12 z-10">
          <div className="grid grid-cols-12 items-end gap-6">
            
            <div className="col-span-12 lg:col-span-8">
              <h1
                className="font-extrabold leading-[0.85] tracking-[-0.06em] text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] xl:text-[13vw] uppercase select-none drop-shadow-md"
                style={{ color: "#E1E0CC" }}
              >
                <WordsPullUp text={title} showAsterisk />
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-6 pb-2 lg:col-span-4 lg:pb-4">
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm sm:text-base md:text-lg text-white/80 font-normal leading-relaxed"
              >
                {subtitle}
              </motion.p>

              <motion.a
                href={ctaHref}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group inline-flex items-center gap-3 self-start rounded-full bg-[#E1E0CC] py-1.5 pl-6 pr-1.5 text-sm font-semibold text-black transition-all hover:bg-white hover:gap-4 sm:text-base shadow-xl"
              >
                {ctaText}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4 text-[#E1E0CC]" />
                </span>
              </motion.a>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
