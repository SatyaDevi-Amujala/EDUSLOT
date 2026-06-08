import { useEffect, useMemo, useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/roles';
const ACTIONS = [
  ['can_view', 'has_view', 'View'],
  ['can_add', 'has_add', 'Add'],
  ['can_edit', 'has_edit', 'Edit'],
  ['can_delete', 'has_delete', 'Delete'],
  ['can_status', 'has_status', 'Status'],
  ['can_download', 'has_download', 'Download'],
];

export default function Roles() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [pages, setPages] = useState([]);
  const [modal, setModal] = useState(null);     // { id?, name, description }
  const [matrix, setMatrix] = useState({});     // pageId -> { can_view, ... }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { crud.api.get('/pages').then(setPages).catch(() => {}); }, [crud.api]);

  // Ordered page list with depth, for an indented matrix.
  const ordered = useMemo(() => {
    const byParent = {};
    pages.forEach((p) => { (byParent[p.parent_id || 0] ||= []).push(p); });
    Object.values(byParent).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    const out = [];
    const walk = (parent, depth) => (byParent[parent] || []).forEach((p) => { out.push({ ...p, depth }); walk(p.id, depth + 1); });
    walk(0, 0);
    return out;
  }, [pages]);

  const emptyMatrix = () => Object.fromEntries(pages.map((p) => [p.id, { can_view: false, can_add: false, can_edit: false, can_delete: false, can_status: false, can_download: false }]));

  const openAdd = () => { setErr({}); setMatrix(emptyMatrix()); setModal({ name: '', description: '' }); };
  const openEdit = async (row) => {
    setErr({});
    const detail = await crud.api.get(`${ROUTE}/${row.id}`);
    const m = {};
    detail.permissions.forEach((p) => { m[p.page_id] = { can_view: p.can_view, can_add: p.can_add, can_edit: p.can_edit, can_delete: p.can_delete, can_status: p.can_status, can_download: p.can_download }; });
    setMatrix(m);
    setModal({ id: row.id, name: row.name, description: row.description || '' });
  };

  const setCell = (pageId, key, val) => setMatrix((m) => ({ ...m, [pageId]: { ...m[pageId], [key]: val } }));

  const save = async () => {
    if (!modal.name) { setErr({ name: 'Required' }); return; }
    const permissions = Object.entries(matrix).map(([page_id, v]) => ({ page_id: Number(page_id), ...v }));
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, { ...modal, permissions }); toast.success('Role updated'); }
      else { await crud.api.post(ROUTE, { ...modal, permissions }); toast.success('Role created'); }
      setModal(null); crud.reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('Role deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'name', header: 'Role', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'description', header: 'Description', render: (r) => r.description || <span className="text-slate-400">—</span> },
    { key: 'page_count', header: 'Pages', render: (r) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.page_count}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="Role Management" subtitle="Create roles and grant page-level permissions"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add Role" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Role' : 'Add Role'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Role name" required value={modal.name} error={err.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              <Input label="Description" value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="px-3 py-2">Page</th>
                      {ACTIONS.map(([, , label]) => <th key={label} className="px-3 py-2 text-center">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700" style={{ paddingLeft: 12 + p.depth * 18 }}>
                          {p.depth > 0 && <span className="text-slate-300">└ </span>}{p.name}
                        </td>
                        {ACTIONS.map(([col, flag, label]) => (
                          <td key={label} className="px-3 py-2 text-center">
                            {p[flag] ? (
                              <input type="checkbox" checked={!!matrix[p.id]?.[col]}
                                onChange={(e) => setCell(p.id, col, e.target.checked)} />
                            ) : <span className="text-slate-200">–</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete role?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
