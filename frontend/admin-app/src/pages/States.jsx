import { useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, MultiSelect, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/masters/states';

export default function States() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);     // { id?, code, name, campus_ids }
  const [campusOpts, setCampusOpts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  const loadCampuses = async (stateId) => {
    const qs = stateId ? `?all=1&stateId=${stateId}` : '?all=1&unassigned=1';
    const rows = await crud.api.get(`/masters/campuses${qs}`);
    setCampusOpts(rows.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })));
  };

  const openAdd = async () => { setErr({}); await loadCampuses(); setModal({ code: '', name: '', campus_ids: [] }); };
  const openEdit = async (row) => {
    setErr({});
    const [detail] = await Promise.all([crud.api.get(`${ROUTE}/${row.id}`), loadCampuses(row.id)]);
    setModal({ id: row.id, code: detail.code, name: detail.name, campus_ids: detail.campus_ids });
  };

  const save = async () => {
    if (!modal.code || !modal.name) { setErr({ code: !modal.code ? 'Required' : '', name: !modal.name ? 'Required' : '' }); return; }
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, modal); toast.success('State updated'); }
      else { await crud.api.post(ROUTE, modal); toast.success('State created'); }
      setModal(null); crud.reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const doDelete = async () => {
    try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('State deleted'); setConfirm(null); crud.reload(); }
    catch (e) { toast.error(e.message); }
  };
  const toggle = async (row) => {
    try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-medium text-slate-800">{r.code}</span> },
    { key: 'name', header: 'State' },
    { key: 'campus_count', header: 'Campuses', render: (r) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.campus_count}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="States" subtitle="Manage states and the campuses mapped to them"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add State" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit State' : 'Add State'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="space-y-4">
            <Input label="Code" required value={modal.code} error={err.code}
              onChange={(e) => setModal({ ...modal, code: e.target.value.toUpperCase() })} placeholder="e.g. TS" />
            <Input label="State name" required value={modal.name} error={err.name}
              onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="e.g. Telangana" />
            <MultiSelect label="Campuses" options={campusOpts} value={modal.campus_ids}
              onChange={(v) => setModal({ ...modal, campus_ids: v })}
              placeholder="Map campuses to this state" />
            <p className="text-xs text-slate-400">Campuses already mapped to another state are hidden here.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete state?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
