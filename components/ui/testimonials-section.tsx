import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Marquee } from '@/components/ui/marquee';

const testimonials = [
  {
    name: 'Ava Green',
    username: '@ava',
    body: 'Eternity transformed our entire digital presence. Exceptional work!',
    img: 'https://cdn.21st.dev/assets/mirror/55/55cf6231499bcdc496f15ff1d28d4170ac9b99e9279495caa44fca70886d8b2e.jpg',
    country: '🇦🇺 Australia',
  },
  {
    name: 'Ana Miller',
    username: '@ana',
    body: 'The 3D marquee component is smooth and engaging. Highly recommended.',
    img: 'https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg',
    country: '🇩🇪 Germany',
  },
  {
    name: 'Mateo Rossi',
    username: '@mat',
    body: 'Animations are buttery smooth! Performance is pristine.',
    img: 'https://cdn.21st.dev/assets/mirror/7c/7c0d2aa99715b15c218385f5679347782843c02f939d8eee6f9cb1cad6ba6ed0.jpg',
    country: '🇮🇹 Italy',
  },
  {
    name: 'Maya Patel',
    username: '@maya',
    body: 'Setup was seamless. Integration was straightforward. Love it!',
    img: 'https://cdn.21st.dev/assets/mirror/f8/f8f2ddc445b6b2318430260bdebb665c9415865827230565aa42f57c9c794baf.jpg',
    country: '🇮🇳 India',
  },
  {
    name: 'Noah Smith',
    username: '@noah',
    body: 'Best testimonial component we\'ve ever used in production.',
    img: 'https://cdn.21st.dev/assets/mirror/ae/ae1d49872fdd6f8d9aa933f6ca8bce8cb1ba7e87dfb9d2926661184cb7bfe26d.jpg',
    country: '🇺🇸 USA',
  },
  {
    name: 'Lucas Stone',
    username: '@luc',
    body: 'Customizable, performant, and visually stunning.',
    img: 'https://cdn.21st.dev/assets/mirror/9a/9aac54d62e727561f6958213b8a3649230a3bba61ba5ddf63c69d3c6e4aecb0a.jpg',
    country: '🇫🇷 France',
  },
  {
    name: 'Haruto Sato',
    username: '@haru',
    body: 'Mobile performance is impressive. Responsive and fast.',
    img: 'https://cdn.21st.dev/assets/mirror/e5/e55f3cdab57eb4084f7006cfe9f7f047e638e1b257a53498aaed14b83087152a.jpg',
    country: '🇯🇵 Japan',
  },
  {
    name: 'Emma Lee',
    username: '@emma',
    body: 'Per-column pause on hover is a game-changer for UX.',
    img: 'https://cdn.21st.dev/assets/mirror/03/03410c155320ba33ecb8d798807c6c9610f33b2b2acdd4ed961a68185806df79.jpg',
    country: '🇨🇦 Canada',
  },
  {
    name: 'Carlos Ray',
    username: '@carl',
    body: 'Perfect for showcasing client testimonials. Highly effective.',
    img: 'https://cdn.21st.dev/assets/mirror/b5/b58616f0d669595c9a42d60a0b9803364c9859f1c3db93a5e3dc408b603e03e8.jpg',
    country: '🇪🇸 Spain',
  },
];

function TestimonialCard({ img, name, username, body, country }: (typeof testimonials)[number]) {
  return (
    <Card className="w-[280px] flex-shrink-0 bg-[#1F1F1F] border-0 transition-all duration-300 ease-out hover:bg-[#0F0F0F] hover:shadow-2xl hover:shadow-black/50 cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="size-10">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback className="bg-[#2A2A2A]">{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <figcaption className="text-sm font-semibold text-[#E8E8E8] flex items-center gap-1 truncate group-hover:text-[#FFFFFF] transition-colors duration-300">
              {name} <span className="text-xs text-[#888888]">{country}</span>
            </figcaption>
            <p className="text-xs font-medium text-[#707070] group-hover:text-[#888888] transition-colors duration-300">{username}</p>
          </div>
        </div>
        <blockquote className="text-sm text-[#A0A0A0] leading-relaxed line-clamp-3 group-hover:text-[#C0C0C0] transition-colors duration-300">
          {body}
        </blockquote>
      </CardContent>
    </Card>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-[#0A0A0A] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="inline-block text-[#2563EB] text-xs font-semibold tracking-widest uppercase mb-4">
            Trusted by Industry Leaders
          </span>
          <h2 className="text-4xl font-bold text-[#E8E8E8] mb-4">
            What Our Clients Say
          </h2>
          <p className="text-lg text-[#A0A0A0]">
            Real feedback from real projects. See why businesses trust Eternity for their digital transformation.
          </p>
        </div>

        {/* Testimonials Container - NO BORDER, SHIFTED LEFT */}
        <div className="relative mx-auto max-w-7xl -ml-12">
          {/* PERSPECTIVE - NO BORDER */}
          <div className="relative flex h-96 w-full flex-row items-center justify-center overflow-hidden gap-1.5 [perspective:300px]">
            {/* INNER DIV WITH TILT - FASTER ANIMATION */}
            <div
              className="flex flex-row items-center gap-4"
              style={{
                transform:
                  'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
              }}
            >
              {/* Column 1 - Down - FASTER (25s instead of 40s) */}
              <Marquee
                vertical
                columnPauseOnHover
                repeat={3}
                className="[--duration:25s]"
              >
                {testimonials.map((review) => (
                  <TestimonialCard key={review.username} {...review} />
                ))}
              </Marquee>

              {/* Column 2 - Up - FASTER */}
              <Marquee
                vertical
                reverse
                columnPauseOnHover
                repeat={3}
                className="[--duration:25s]"
              >
                {testimonials.map((review) => (
                  <TestimonialCard key={review.username} {...review} />
                ))}
              </Marquee>

              {/* Column 3 - Down - FASTER */}
              <Marquee
                vertical
                columnPauseOnHover
                repeat={3}
                className="[--duration:25s]"
              >
                {testimonials.map((review) => (
                  <TestimonialCard key={review.username} {...review} />
                ))}
              </Marquee>

              {/* Column 4 - Up - FASTER */}
              <Marquee
                vertical
                reverse
                columnPauseOnHover
                repeat={3}
                className="[--duration:25s]"
              >
                {testimonials.map((review) => (
                  <TestimonialCard key={review.username} {...review} />
                ))}
              </Marquee>

              {/* Gradient Fade Overlays - SMOOTH FADEOUT */}
              {/* Top Fade - Stronger gradient */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent z-20"></div>

              {/* Bottom Fade - Stronger gradient */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent z-20"></div>

              {/* Left Fade - Smooth fadeout */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent z-20"></div>

              {/* Right Fade - Smooth fadeout */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent z-20"></div>
            </div>
          </div>
        </div>

        {/* CTA Below */}
        <div className="mt-20 text-center">
          <p className="text-[#A0A0A0] mb-6 max-w-xl mx-auto">
            Ready to join these companies? Let's discuss your next big project.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center justify-center px-8 py-3 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors"
          >
            Start Your Project →
          </a>
        </div>
      </div>
    </section>
  );
}
