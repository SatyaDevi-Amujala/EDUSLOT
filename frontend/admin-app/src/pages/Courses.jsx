import { useEffect, useState } from 'react';
import { PageHeader, DataTable, Modal, ConfirmDialog, Button, Input, SingleSelect, useToast } from 'shell/ui';
import { usePermission } from 'shell/access';
import { useCrud } from '../lib/crud';
import { RowActions } from '../lib/RowActions';

const ROUTE = '/masters/courses';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OPTS = DAYS.map((d, i) => ({ value: i, label: d }));

export default function Courses() {
  const perms = usePermission(ROUTE);
  const crud = useCrud(ROUTE);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [cats, setCats] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    crud.api.get('/masters/categories?all=1').then((r) => setCats(r.map((d) => ({ value: d.id, label: d.name })))).catch(() => {});
    crud.api.get('/masters/instructors?all=1').then((r) => setInstructors(r.map((i) => ({ value: i.id, label: i.name })))).catch(() => {});
    crud.api.get('/masters/campuses?all=1').then((r) => setCampuses(r.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })))).catch(() => {});
  }, [crud.api]);

  const blank = { code: '', name: '', category_id: '', instructor_id: '', campus_id: '', capacity: 30, day_of_week: '', start_time: '18:00', end_time: '20:00' };
  const openAdd = () => { setErr({}); setModal({ ...blank }); };
  const openEdit = async (row) => {
    setErr({});
    const d = await crud.api.get(`${ROUTE}/${row.id}`);
    setModal({ id: d.id, code: d.code, name: d.name, category_id: d.category_id || '', instructor_id: d.instructor_id || '',
      campus_id: d.campus_id || '', capacity: d.capacity, day_of_week: d.day_of_week ?? '', start_time: d.start_time || '18:00', end_time: d.end_time || '20:00' });
  };

  const save = async () => {
    const e = {};
    if (!modal.code) e.code = 'Required';
    if (!modal.name) e.name = 'Required';
    if (Object.keys(e).length) { setErr(e); return; }
    const payload = {
      ...modal,
      category_id: modal.category_id || null, instructor_id: modal.instructor_id || null, campus_id: modal.campus_id || null,
      capacity: Number(modal.capacity) || 30, day_of_week: modal.day_of_week === '' ? null : Number(modal.day_of_week),
    };
    setSaving(true);
    try {
      if (modal.id) { await crud.api.put(`${ROUTE}/${modal.id}`, payload); toast.success('Course updated'); }
      else { await crud.api.post(ROUTE, payload); toast.success('Course created'); }
      setModal(null); crud.reload();
    } catch (e2) { toast.error(e2.message); } finally { setSaving(false); }
  };
  const doDelete = async () => { try { await crud.api.del(`${ROUTE}/${confirm.id}`); toast.success('Course deleted'); setConfirm(null); crud.reload(); } catch (e) { toast.error(e.message); } };
  const toggle = async (row) => { try { await crud.api.patch(`${ROUTE}/${row.id}/status`); crud.reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-medium text-slate-800">{r.code}</span> },
    { key: 'name', header: 'Course' },
    { key: 'category_name', header: 'Category', render: (r) => r.category_name || <span className="text-slate-400">—</span> },
    { key: 'instructor_name', header: 'Instructor', render: (r) => r.instructor_name || <span className="text-slate-400">—</span> },
    { key: 'schedule', header: 'Schedule', render: (r) => r.day_of_week == null ? <span className="text-slate-400">—</span> : `${DAYS[r.day_of_week]} ${r.start_time}–${r.end_time}` },
    { key: 'capacity', header: 'Seats', render: (r) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.capacity}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <RowActions row={r} perms={perms} onEdit={openEdit} onDelete={setConfirm} onToggle={toggle} />
    ) },
  ];

  return (
    <div>
      <PageHeader title="Courses" subtitle="Classes students enroll into (each has a seat capacity)"
        search={crud.search} onSearch={(v) => { crud.setPage(1); crud.setSearch(v); }}
        onAdd={openAdd} addLabel="Add Course" canAdd={perms.can_add} />
      <DataTable columns={columns} rows={crud.data} loading={crud.loading}
        page={crud.page} limit={crud.limit} total={crud.total}
        onPage={crud.setPage} onLimit={(l) => { crud.setPage(1); crud.setLimit(l); }} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Course' : 'Add Course'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
        {modal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Code" required value={modal.code} error={err.code} onChange={(e) => setModal({ ...modal, code: e.target.value.toUpperCase() })} placeholder="e.g. WD101" />
            <Input label="Course name" required value={modal.name} error={err.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="e.g. React Fundamentals" />
            <SingleSelect label="Category" options={cats} value={modal.category_id} onChange={(v) => setModal({ ...modal, category_id: v })} placeholder="Select category" />
            <SingleSelect label="Instructor" options={instructors} value={modal.instructor_id} onChange={(v) => setModal({ ...modal, instructor_id: v })} placeholder="Select instructor" />
            <SingleSelect label="Campus" options={campuses} value={modal.campus_id} onChange={(v) => setModal({ ...modal, campus_id: v })} placeholder="Select campus" />
            <Input label="Seat capacity" type="number" min="1" value={modal.capacity} onChange={(e) => setModal({ ...modal, capacity: e.target.value })} />
            <SingleSelect label="Day of week" options={DAY_OPTS} value={modal.day_of_week} onChange={(v) => setModal({ ...modal, day_of_week: v })} placeholder="Select day" searchable={false} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Start time" type="time" value={modal.start_time} onChange={(e) => setModal({ ...modal, start_time: e.target.value })} />
              <Input label="End time" type="time" value={modal.end_time} onChange={(e) => setModal({ ...modal, end_time: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title="Delete course?" message={`This will soft-delete "${confirm?.name}".`} />
    </div>
  );
}
