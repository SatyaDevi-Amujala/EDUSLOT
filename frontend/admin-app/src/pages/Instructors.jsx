import { useEffect, useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, SingleSelect, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/masters/instructors';

export default function Instructors() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [cats, setCats] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    crud.api.get('/masters/categories?all=1').then((r) => setCats(r.map((d) => ({ value: d.id, label: d.name })))).catch(() => {});
    crud.api.get('/masters/campuses?all=1').then((r) => setCampuses(r.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })))).catch(() => {});
  }, [crud.api]);

  const openAdd = () => { setErr({}); setModal({ name: '', email: '', designation: '', category_id: '', campus_id: '' }); };
  const openEdit = async (row) => {
    setErr({});
    const d = await crud.api.get(`${ROUTE}/${row.id}`);
    setModal({ id: d.id, name: d.name, email: d.email || '', designation: d.designation || '', category_id: d.category_id || '', campus_id: d.campus_id || '' });
  };

  const save = async () => {
    if (!modal.name) { setErr({ name: 'Required' }); return; }
    const payload = { ...modal, category_id: modal.category_id || null, campus_id: modal.campus_id || null };
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, payload); toast.success('Instructor updated'); }
      else { await crud.api.post(ROUTE, payload); toast.success('Instructor created'); }
      setModal(null); crud.reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('Instructor deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'name', header: 'Instructor', render: (r) => <div><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.email}</div></div> },
    { key: 'designation', header: 'Designation', render: (r) => r.designation || <span className="text-slate-400">—</span> },
    { key: 'category_name', header: 'Category', render: (r) => r.category_name || <span className="text-slate-400">—</span> },
    { key: 'campus_name', header: 'Campus', render: (r) => r.campus_name || <span className="text-slate-400">—</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="Instructors" subtitle="Teaching staff and their category / campus"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add Instructor" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Instructor' : 'Add Instructor'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" required value={modal.name} error={err.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            <Input label="Email" type="email" value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} />
            <Input label="Designation" value={modal.designation} onChange={(e) => setModal({ ...modal, designation: e.target.value })} placeholder="e.g. Senior Instructor" />
            <SingleSelect label="Category" options={cats} value={modal.category_id} onChange={(v) => setModal({ ...modal, category_id: v })} placeholder="Select category" />
            <SingleSelect label="Campus" options={campuses} value={modal.campus_id} onChange={(v) => setModal({ ...modal, campus_id: v })} placeholder="Select campus" />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete instructor?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
