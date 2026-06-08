import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button, Spinner, useToast } from 'shell/ui';
import { useApi } from 'shell/access';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BrowseCourses() {
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCourses(await api.get('/courses')); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [api, toast]);
  useEffect(() => { load(); }, [load]);

  const enroll = async (course) => {
    setEnrollingId(course.id);
    try {
      await api.post('/enrollments', { course_id: course.id });
      toast.success(`Enrolled in ${course.name}!`);
      load();
    } catch (e) { toast.error(e.message); } finally { setEnrollingId(null); }
  };

  const filtered = courses.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.category_name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Browse Courses" subtitle="Pick a course and grab a seat"
        search={search} onSearch={setSearch} searchPlaceholder="Search courses…"
        onAdd={() => navigate('/enrollments')} addLabel="My Enrollments" />

      {loading ? (
        <div className="flex justify-center p-12"><Spinner label="Loading courses…" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">No courses found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const full = c.seats_left <= 0;
            const pct = c.capacity ? Math.round((c.seats_taken / c.capacity) * 100) : 0;
            return (
              <div key={c.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{c.category_name || 'General'}</span>
                  <span className="text-xs text-slate-400">{c.code}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-800">{c.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {c.instructor_name || 'TBA'}{c.campus_name ? ` · ${c.campus_name}` : ''}
                </p>
                {c.day_of_week != null && (
                  <p className="mt-1 text-xs text-slate-400">{DAYS[c.day_of_week]} · {c.start_time}–{c.end_time}</p>
                )}

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className={full ? 'font-medium text-rose-600' : 'font-medium text-emerald-600'}>
                      {full ? 'Full' : `${c.seats_left} seats left`}
                    </span>
                    <span className="text-slate-400">{c.seats_taken}/{c.capacity}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${full ? 'bg-rose-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-4">
                  <Button className="w-full" disabled={full} loading={enrollingId === c.id} onClick={() => enroll(c)}>
                    {full ? 'No seats' : 'Enroll'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
