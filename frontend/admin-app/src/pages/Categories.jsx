import { useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/masters/categories';

export default function Categories() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null);

  const save = async () => {
    if (!modal.name) { setErr('Required'); return; }
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, modal); toast.success('Category updated'); }
      else { await crud.api.post(ROUTE, modal); toast.success('Category created'); }
      setModal(null); crud.reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('Category deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'name', header: 'Category', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={(row) => { setErr(''); setModal({ id: row.id, name: row.name }); }} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="Categories" subtitle="Course categories (e.g. Web Development, Data Science)"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={() => { setErr(''); setModal({ name: '' }); }} addLabel="Add Category" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Category' : 'Add Category'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <Input label="Category name" required value={modal.name} error={err}
            onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="e.g. Web Development" />
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete category?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
