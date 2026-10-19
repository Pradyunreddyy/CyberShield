import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal ring-1 ring-signal/25">
        <ShieldAlert size={17} aria-hidden="true" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-ink">CyberShield</span>
    </div>
  );
}

export function AuthLayout({ children, title, subtitle }) {
  useEffect(() => {
    document.title = `${title} · CyberShield`;
  }, [title]);

  return (
    <div className="flex min-h-dvh w-full bg-void">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden border-r border-hairline bg-panel px-10 py-10 lg:flex">
        <Brand />

        <div className="relative z-10">
          <p className="text-sm font-medium text-signal">AI-Powered Cybersecurity Incident Response Platform</p>
          <p className="mt-3 max-w-sm text-2xl font-semibold leading-snug text-ink">Detect, investigate, and resolve threats with an AI analyst at your side.</p>
          <ul className="mt-7 space-y-3 text-sm text-ink-muted">
            <li className="flex items-center gap-3">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-severity-critical" /> Real-time incident tracking
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-severity-high" /> AI-assisted threat analysis
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-state-success" /> Static project security scanning
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-ink-muted">Detect. Analyze. Respond. Secure.</p>

        {/* Static decorative rings; deliberately not animated. */}
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-signal/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full border border-signal/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-40 w-40 rounded-full border border-signal/15" />
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
