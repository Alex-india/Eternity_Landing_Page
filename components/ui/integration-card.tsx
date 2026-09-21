"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90 shadow-sm",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

interface VisualContainerProps {
  children: React.ReactNode;
  className?: string;
}

interface TeamCardProps {
  visual: React.ReactNode;
  title: string;
  description: string;
  url: string;
}

interface IntegrationItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
  path: string;
  delay: number;
}

/* ==========================================================================
   MONOCHROME VECTOR LOGOS (Original Theme Style)
   ========================================================================== */

const FigmaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm-6 6a3 3 0 0 1 3-3h3v3a3 3 0 1 1-6 0Zm0-6a3 3 0 0 1 3-3h3v6H9a3 3 0 0 1-3-3Zm0-6a3 3 0 0 1 3-3h3v6H9a3 3 0 0 1-3-3Zm6-3h3a3 3 0 1 1 0 6h-3V3Z" />
  </svg>
);

const NextjsLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.5 2C6.25 2 2 6.25 2 11.5S6.25 21 11.5 21c2.19 0 4.21-.74 5.82-2l-7.7-10.05v7.68H8.1V7.37h1.41l7.85 10.36c1.33-1.63 2.14-3.72 2.14-6.23C19.5 6.25 15.25 2 11.5 2Zm3.4 9.87h1.52V7.37H14.9v4.5Z" />
  </svg>
);

const ReactLogo = ({ className }: { className?: string }) => (
  <svg viewBox="-11.5 -10.23 23 20.46" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
    <circle cx="0" cy="0" r="2" fill="currentColor" stroke="none" />
    <ellipse rx="11" ry="4.2" />
    <ellipse rx="11" ry="4.2" transform="rotate(60)" />
    <ellipse rx="11" ry="4.2" transform="rotate(120)" />
  </svg>
);

const ReactNativeLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="3" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12" rx="4.5" ry="1.8" strokeWidth="1" />
    <ellipse cx="12" cy="12" rx="4.5" ry="1.8" strokeWidth="1" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="4.5" ry="1.8" strokeWidth="1" transform="rotate(120 12 12)" />
  </svg>
);

const FirebaseLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.36 18.45 6.9 3.3a.7.7 0 0 1 1.28-.15l2.85 5.4-6.67 9.9Zm7.5-6.15-2.03-3.83-5.47 10 7.5-6.17Zm-.68 7.37-6.82-3.67 6.82 3.67Zm8.46-1.22L16.5 4.7a.7.7 0 0 0-1.2-.3L3.82 18.45l8.18 4.65a1.5 1.5 0 0 0 1.48 0l6.16-4.65Z" />
  </svg>
);

const SupabaseLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.05 2.4c-.5-.7-1.6-.3-1.6.6v8.4H3.82c-1 0-1.5 1.2-.8 1.8l9.13 10c.5.7 1.6.3 1.6-.6v-8.4h7.63c1 0 1.5-1.2.8-1.8l-9.13-10Z" />
  </svg>
);

const NodejsLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2 3.5 7v10L12 22l8.5-5V7L12 2Z" />
    <path d="M9 15V9l6 6V9" strokeWidth="1.8" />
  </svg>
);

// Center is 282, 205
const integrations: IntegrationItem[] = [
  {
    id: "figma", // Top-Left
    icon: FigmaLogo,
    x: 110,
    y: 90,
    path: "M 270 205 V 105 Q 270 90 255 90 H 110",
    delay: 0.1,
  },
  {
    id: "nextjs", // Top-Right
    icon: NextjsLogo,
    x: 360,
    y: 70,
    path: "M 294 205 V 85 Q 294 70 309 70 H 360",
    delay: 0.2,
  },
  {
    id: "nodejs", // Mid-Left
    icon: NodejsLogo,
    x: 160,
    y: 205,
    path: "M 250 205 H 160",
    delay: 0.3,
  },
  {
    id: "react", // Mid-Right
    icon: ReactLogo,
    x: 480,
    y: 205,
    path: "M 314 205 H 480",
    delay: 0.4,
  },
  {
    id: "firebase", // Bottom-Center
    icon: FirebaseLogo,
    x: 282,
    y: 360,
    path: "M 282 205 V 360",
    delay: 0.5,
  },
  {
    id: "react-native", // Bottom-Right
    icon: ReactNativeLogo,
    x: 460,
    y: 340,
    path: "M 314 215 V 325 Q 314 340 329 340 H 460",
    delay: 0.6,
  },
  {
    id: "supabase", // Bottom-Left
    icon: SupabaseLogo,
    x: 130,
    y: 330,
    path: "M 264 205 V 315 Q 264 330 249 330 H 130",
    delay: 0.7,
  },
];

const AnimatedPath = ({ d, id }: { d: string; id: string }) => {
  return (
    <>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        className="text-white/10"
      />
      <motion.path
        d={d}
        stroke={`url(#${id})`}
        strokeWidth="2"
        fill="none"
        strokeDasharray="40 160"
        initial={{ strokeDashoffset: 200 }}
        animate={{ strokeDashoffset: -200 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          delay: Math.random() * 2,
        }}
      />
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </>
  );
};

export function Integration() {
  const containerId = useId();

  return (
    <div className="relative h-full w-full">
      {/* SVG Lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 564 410"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {integrations.map((integration) => (
          <AnimatedPath
            key={integration.id}
            d={integration.path}
            id={`${containerId}-${integration.id}`}
          />
        ))}
      </svg>

      {/* Center Logo */}
      <div className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-[#121214] p-1.5 shadow-xl sm:p-2">
        <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-white text-black font-extrabold text-[10px] sm:text-[11px] tracking-tight shadow-md">
          <span>eternity</span>
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-white/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Peripheral Icons - NO names mentioned, clean floating tiles */}
      {integrations.map((integration) => {
        const Icon = integration.icon;
        return (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: integration.delay }}
            style={{
              left: `${(integration.x / 564) * 100}%`,
              top: `${(integration.y / 410) * 100}%`,
            }}
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-[#18181b] shadow-md sm:h-12 sm:w-12 text-white"
          >
            <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-white" />
          </motion.div>
        );
      })}
    </div>
  );
}

export function VisualContainer({ children, className }: VisualContainerProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-564/460 w-full items-center justify-center overflow-hidden rounded-none bg-[#111215] p-8 sm:aspect-564/410",
        className,
      )}
    >
      {/* Dots Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#111215]/80 via-transparent to-[#111215]/80" />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}

const IntegrationCard = ({
  visual,
  title,
  description,
  url,
}: TeamCardProps) => {
  return (
    <Card className="mx-auto flex w-full flex-col sm:max-w-141 rounded-2xl overflow-hidden p-0 ring-0 border border-white/10 bg-[#111215] text-white shadow-2xl gap-0">
      <VisualContainer>{visual}</VisualContainer>

      <CardContent className="p-6 sm:p-8 flex flex-col gap-6 sm:gap-8 bg-[#111215]">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            {title}
          </h3>
          <p className="text-base leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>
        <Button
          nativeButton={false}
          className="h-10 w-fit rounded-full px-6 bg-white text-black hover:bg-white/90 font-medium cursor-pointer"
          render={<a href={url} />}
        >
          Learn more
        </Button>
      </CardContent>
    </Card>
  );
};

export function IntegrationCardDemo() {
  return (
    <div className="flex items-center justify-center w-full min-h-96 p-4 sm:p-6 bg-black">
      <IntegrationCard
        visual={<Integration />}
        title="Seamless Integrations"
        description="Connect your favorite tools and keep your workflows unified without switching between platforms."
        url="#"
      />
    </div>
  );
}

export default IntegrationCardDemo;
