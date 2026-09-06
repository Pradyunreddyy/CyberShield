import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { alertsApi } from "../api/endpoints";

export function TopBar({ pageTitle, onOpenMobileNav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    alertsApi
      .list({ unread_only: true })
      .then((res) => mounted && setUnreadCount(res.data.length))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-void px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-panel-raised hover:text-ink lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="truncate text-sm font-semibold text-ink">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <button
          onClick={() => navigate("/alerts")}
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-panel-raised hover:text-ink"
          aria-label="View alerts"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-severity-critical px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-panel-raised"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-signal/15 text-signal">
              <User size={14} />
            </div>
            <span className="hidden max-w-[120px] truncate sm:inline">{user?.full_name}</span>
            <ChevronDown size={14} className="text-ink-faint" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-hairline bg-panel-raised py-1 shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-muted hover:bg-hairline-soft hover:text-ink"
              >
                <User size={14} /> Profile
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-severity-critical hover:bg-hairline-soft"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
