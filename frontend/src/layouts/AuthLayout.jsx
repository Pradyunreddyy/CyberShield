import { ShieldAlert } from "lucide-react";

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen w-full bg-void">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden border-r border-hairline bg-panel px-10 py-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
            <ShieldAlert size={17} />
          </div>
          <span className="text-sm font-semibold text-ink">Sentinel SOC</span>
        </div>

        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-widest text-signal">Incident Response Platform</p>
          <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-snug text-ink">
            Detect, investigate, and resolve threats with an AI analyst at your side.
          </h2>
          <ul className="mt-6 space-y-2.5 font-mono text-xs text-ink-muted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-severity-critical animate-pulse-dot" /> Real-time incident
              tracking
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-severity-high" /> AI-assisted threat analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-state-success" /> Static project security scanning
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-ink-faint">Semester Project &middot; Cybersecurity Incident Response</p>

        {/* Subtle decorative radar rings - a single deliberate motion moment, not scattered effects */}
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full border border-signal/10" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full border border-signal/10" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-40 w-40 rounded-full border border-signal/15" />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
              <ShieldAlert size={17} />
            </div>
            <span className="text-sm font-semibold text-ink">Sentinel SOC</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
