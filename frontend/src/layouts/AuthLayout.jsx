import { useEffect } from "react";
import { Activity, ScanSearch, Sparkles } from "lucide-react";
import { AmbientBackground } from "../components/AmbientBackground";
import { LogoMark, Wordmark } from "../components/Logo";

const FEATURES = [
  { icon: Activity, label: "Real-time incident tracking" },
  { icon: Sparkles, label: "AI-assisted threat analysis" },
  { icon: ScanSearch, label: "Static project scanning" },
];

// Shared by Login and Register. Props are unchanged: { title, subtitle, children }.
export function AuthLayout({ children, title, subtitle }) {
  useEffect(() => {
    document.title = `${title} · CyberShield`;
  }, [title]);

  return (
    <div className="relative isolate min-h-dvh w-full overflow-x-hidden bg-void">
      <AmbientBackground variant="auth" />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-12">
        {/* Brand */}
        <div className="flex animate-fade flex-col items-center text-center">
          <div className="relative">
            {/* The halo is a separate layer behind the logo; the logo is never filtered or recoloured. */}
            <div aria-hidden="true" className="logo-halo absolute -inset-8 sm:-inset-10" />
            <LogoMark variant="auth" height={88} alt="CyberShield" className="relative sm:!h-24" />
          </div>
          <Wordmark className="mt-4 text-2xl sm:text-3xl" />
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink/80 sm:max-w-sm sm:text-sm">
            AI-Powered Cybersecurity Incident Response Platform
          </p>
        </div>

        {/* Glass card */}
        <div className="auth-card mt-6 w-full animate-rise rounded-xl p-5 sm:mt-8 sm:p-8">
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {/* Desktop-only supporting line; kept off phones so nothing competes with the form. */}
        <ul className="mt-8 hidden flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-muted md:flex">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon size={13} aria-hidden="true" className="text-signal-bright" /> {label}
            </li>
          ))}
        </ul>
        <p className="mt-4 hidden text-xs tracking-wide text-ink-faint md:block">Detect. Analyze. Respond. Secure.</p>
      </main>
    </div>
  );
}
