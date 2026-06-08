import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, ConfirmDialog, Button, useToast } from 'shell/ui';
import { useApi } from 'shell/access';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS = {
  enrolled: 'bg-brand-50 text-brand-700',
  dropped: 'bg-rose-50 text-rose-600',
  completed: 'bg-emerald-50 text-emerald-600',
};

export default function MyEnrollments() {
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.get('/enrollments')); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [api, toast]);
  useEffect(() => { load(); }, [load]);

  const drop = async () => {
    try { await api.patch(`/enrollments/${confirm.id}/drop`); toast.success('Course dropped'); setConfirm(null); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'course_name', header: 'Course', render: (r) => <div><div className="font-medium text-slate-800">{r.course_name || '—'}</div><div className="text-xs text-slate-400">{r.course_code}</div></div> },
    { key: 'instructor_name', header: 'Instructor', render: (r) => r.instructor_name || '—' },
    { key: 'campus_name', header: 'Campus', render: (r) => r.campus_name || '—' },
    { key: 'schedule', header: 'Schedule', render: (r) => r.day_of_week == null ? '—' : `${DAYS[r.day_of_week]} ${r.start_time || ''}–${r.end_time || ''}` },
    { key: 'status', header: 'Status', render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      r.status === 'enrolled'
        ? <Button variant="ghost" size="sm" onClick={() => setConfirm(r)} className="text-rose-600">Drop</Button>
        : null
    ) },
  ];

  return (
    <div>
      <PageHeader title="My Enrollments" subtitle="Courses you're enrolled in"
        onAdd={() => navigate('/courses')} addLabel="Browse Courses" />
      <DataTable columns={columns} rows={rows} loading={loading} emptyText="No enrollments yet — browse courses to enroll!" />

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={drop}
        title="Drop course?" confirmLabel="Yes, drop"
        message={`Drop "${confirm?.course_name}"? This frees your seat for someone else.`} />
    </div>
  );
}
