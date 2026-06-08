import { useEffect, useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, SingleSelect, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/users';

export default function Users() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [roles, setRoles] = useState([]);
  const [states, setStates] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    crud.api.get('/roles?limit=100').then((r) => setRoles((r.data || []).map((x) => ({ value: x.id, label: x.name })))).catch(() => {});
    crud.api.get('/masters/states?all=1').then((r) => setStates(r.map((s) => ({ value: s.id, label: s.name })))).catch(() => {});
    crud.api.get('/masters/campuses?all=1').then((r) => setCampuses(r.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })))).catch(() => {});
  }, [crud.api]);

  const openAdd = () => { setErr({}); setModal({ name: '', email: '', password: '', role_id: '', state_id: '', campus_id: '' }); };
  const openEdit = (row) => { setErr({}); setModal({ id: row.id, name: row.name, email: row.email, password: '', role_id: row.role_id || '', state_id: row.state_id || '', campus_id: row.campus_id || '' }); };

  const save = async () => {
    const e = {};
    if (!modal.name) e.name = 'Required';
    if (!modal.email) e.email = 'Required';
    if (!modal.id && !modal.password) e.password = 'Required';
    if (Object.keys(e).length) { setErr(e); return; }
    const payload = { ...modal, role_id: modal.role_id || null, state_id: modal.state_id || null, campus_id: modal.campus_id || null };
    if (modal.id && !modal.password) delete payload.password;
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, payload); toast.success('User updated'); }
      else { await crud.api.post(ROUTE, payload); toast.success('User created'); }
      setModal(null); crud.reload();
    } catch (e2) { toast.error(e2.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('User deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'name', header: 'User', render: (r) => <div><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.email}</div></div> },
    { key: 'role_name', header: 'Role', render: (r) => r.role_name ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{r.role_name}</span> : <span className="text-slate-400">—</span> },
    { key: 'state_name', header: 'State', render: (r) => r.state_name || <span className="text-slate-400">—</span> },
    { key: 'campus_name', header: 'Campus', render: (r) => r.campus_name || <span className="text-slate-400">—</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="User Management" subtitle="Create users, assign a role, state and campus"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add User" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit User' : 'Add User'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full name" required value={modal.name} error={err.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            <Input label="Email" type="email" required value={modal.email} error={err.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} />
            <Input label={modal.id ? 'New password (optional)' : 'Password'} type="password" required={!modal.id} error={err.password}
              value={modal.password} onChange={(e) => setModal({ ...modal, password: e.target.value })} placeholder={modal.id ? 'Leave blank to keep current' : ''} />
            <SingleSelect label="Role" options={roles} value={modal.role_id} onChange={(v) => setModal({ ...modal, role_id: v })} placeholder="Assign a role" />
            <SingleSelect label="State" options={states} value={modal.state_id} onChange={(v) => setModal({ ...modal, state_id: v })} placeholder="Home state" />
            <SingleSelect label="Campus" options={campuses} value={modal.campus_id} onChange={(v) => setModal({ ...modal, campus_id: v })} placeholder="Home campus" />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete user?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
