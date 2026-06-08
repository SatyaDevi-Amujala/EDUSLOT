import { useEffect, useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, SingleSelect, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/masters/campuses';

export default function Campuses() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [states, setStates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    crud.api.get('/masters/states?all=1')
      .then((rows) => setStates(rows.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))))
      .catch(() => {});
  }, [crud.api]);

  const openAdd = () => { setErr({}); setModal({ code: '', name: '', state_id: '' }); };
  const openEdit = (row) => { setErr({}); setModal({ id: row.id, code: row.code, name: row.name, state_id: row.state_id || '' }); };

  const save = async () => {
    if (!modal.code || !modal.name) { setErr({ code: !modal.code ? 'Required' : '', name: !modal.name ? 'Required' : '' }); return; }
    setSaving(true);
    const payload = { ...modal, state_id: modal.state_id || null };
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, payload); toast.success('Campus updated'); }
      else { await crud.api.post(ROUTE, payload); toast.success('Campus created'); }
      setModal(null); crud.reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('Campus deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-medium text-slate-800">{r.code}</span> },
    { key: 'name', header: 'Campus' },
    { key: 'state_name', header: 'State', render: (r) => r.state_name || <span className="text-slate-400">—</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="Campuses" subtitle="Each campus can belong to only one state"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add Campus" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Campus' : 'Add Campus'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="space-y-4">
            <Input label="Code" required value={modal.code} error={err.code}
              onChange={(e) => setModal({ ...modal, code: e.target.value.toUpperCase() })} placeholder="e.g. HYD" />
            <Input label="Campus name" required value={modal.name} error={err.name}
              onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="e.g. Hyderabad Campus" />
            <SingleSelect label="State" options={states} value={modal.state_id}
              onChange={(v) => setModal({ ...modal, state_id: v })} placeholder="Assign to a state (optional)" />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete campus?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
