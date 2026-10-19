import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, UserCog, Users as UsersIcon } from "lucide-react";
import { Panel, PageHeader, EmptyState, SkeletonRows, ErrorState } from "../../components/Primitives";
import { Button, Input, PasswordInput, Select } from "../../components/Form";
import { Modal } from "../../components/Modal";
import { adminApi } from "../../api/endpoints";
import { getApiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, titleCase } from "../../utils/formatters";

const ROLE_STYLE = {
  admin: "border-signal/30 bg-signal/10 text-signal",
  analyst: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  developer: "border-hairline bg-panel-raised text-ink-muted",
};

function RoleBadge({ role }) {
  return <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[role] || ROLE_STYLE.developer}`}>{titleCase(role)}</span>;
}

function ActiveBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${
        active ? "border-state-success/30 bg-state-success/10 text-state-success" : "border-state-danger/30 bg-state-danger/10 text-severity-critical"
      }`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

  function load() {
    setLoading(true);
    setError("");
    adminApi
      .listUsers()
      .then((res) => setUsers(res.data))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => (!role || u.role === role) && (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [users, query, role]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage who can access CyberShield and what they can do."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} aria-hidden="true" /> Create user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5" role="search">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input type="search" aria-label="Search users" placeholder="Search name or email…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select aria-label="Filter by role" wrapperClassName="w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="developer">Developer</option>
        </Select>
      </div>

      <Panel>
        {error ? (
          <ErrorState title="Unable to load users" message="Please check your connection and try again." onRetry={load} />
        ) : loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={UsersIcon} title={users.length === 0 ? "No users found" : "No users match these filters"} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table text-left">
              <caption className="sr-only">Platform users</caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-ink">{u.full_name}</td>
                    <td className="text-ink-muted">{u.email}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <ActiveBadge active={u.is_active} />
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs text-ink-muted">{formatDateTime(u.created_at)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditingUser(u)} aria-label={`Manage ${u.full_name}`}>
                        <UserCog size={13} aria-hidden="true" /> Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} toast={toast} />
      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onUpdated={load} toast={toast} />
    </div>
  );
}

const EMPTY_FORM = { full_name: "", email: "", password: "", role: "developer" };

function CreateUserModal({ open, onClose, onCreated, toast }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // A reopened dialog should never show the previous attempt's error or values.
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError("");
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminApi.createUser(form);
      toast.success("User created.");
      onCreated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create user."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create new user">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <p role="alert" className="rounded-md border border-state-danger/30 bg-state-danger/10 px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}
        <Input label="Full name" required autoComplete="off" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input label="Email" type="email" required autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput
          label="Password"
          name="new_user_password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters."
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="developer">Developer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onUpdated, toast }) {
  const [role, setRole] = useState(user?.role || "developer");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.is_active);
      setConfirming(false);
    }
  }, [user]);

  async function save() {
    setLoading(true);
    try {
      await adminApi.updateUser(user.id, { role, is_active: isActive });
      toast.success("User updated.");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update user."));
    } finally {
      setLoading(false);
    }
  }

  // Disabling an account is the one destructive change here: confirm it first.
  const disabling = !!user && user.is_active && !isActive;
  function handleSave() {
    if (disabling && !confirming) setConfirming(true);
    else save();
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={confirming ? "Disable this user?" : `Manage ${user?.full_name || ""}`}
      footer={
        confirming ? (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} data-autofocus>
              Go back
            </Button>
            <Button variant="danger" loading={loading} onClick={save}>
              Disable user
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading} onClick={handleSave}>
              {disabling ? "Continue" : "Save changes"}
            </Button>
          </>
        )
      }
    >
      {confirming ? (
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-severity-high" />
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">{user?.full_name}</span> ({user?.email}) will no longer be able to sign in. You can re-enable the account later.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="developer">Developer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </Select>
          <Select label="Account status" value={isActive ? "active" : "disabled"} onChange={(e) => setIsActive(e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>
      )}
    </Modal>
  );
}
