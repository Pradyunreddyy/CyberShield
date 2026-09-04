import { useEffect, useState } from "react";
import { Plus, UserCog, Users as UsersIcon } from "lucide-react";
import { Panel, EmptyState, SkeletonRows, ErrorState } from "../../components/Primitives";
import { Button, Input, Select } from "../../components/Form";
import { Modal } from "../../components/Modal";
import { adminApi } from "../../api/endpoints";
import { getApiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, titleCase } from "../../utils/formatters";

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  function load() {
    setLoading(true);
    adminApi
      .listUsers()
      .then((res) => setUsers(res.data))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Create User
        </Button>
      </div>

      <Panel>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Joined</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-hairline-soft">
                    <td className="py-2.5 pr-4 text-ink">{u.full_name}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{u.email}</td>
                    <td className="py-2.5 pr-4 capitalize text-ink-muted">{u.role}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${u.is_active ? "bg-state-success/15 text-state-success" : "bg-severity-critical/15 text-severity-critical"}`}>
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">{formatDateTime(u.created_at)}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditingUser(u)}>
                        <UserCog size={13} /> Manage
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

function CreateUserModal({ open, onClose, onCreated, toast }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "developer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminApi.createUser(form);
      toast.success("User created.");
      setForm({ full_name: "", email: "", password: "", role: "developer" });
      onCreated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create user."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New User">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-md border border-state-danger/30 bg-state-danger/10 px-3 py-2 text-sm text-severity-critical">{error}</p>}
        <Input label="Full name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onUpdated, toast }) {
  const [role, setRole] = useState(user?.role || "developer");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.is_active);
    }
  }, [user]);

  async function handleSave() {
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

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Manage ${user?.full_name || ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSave}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="developer">Developer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </Select>
        <Select label="Account Status" value={isActive ? "active" : "disabled"} onChange={(e) => setIsActive(e.target.value === "active")}>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </Select>
      </div>
    </Modal>
  );
}
