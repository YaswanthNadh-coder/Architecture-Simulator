import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const JoinCoursePage = () => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setStatus('loading');
    setMessage('');

    try {
      // Look up course by join code
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, semester')
        .eq('join_code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (courseError || !course) {
        setStatus('error');
        setMessage('Invalid or expired join code. Double-check with your instructor.');
        return;
      }

      // Enroll
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({ course_id: course.id, student_id: user.id });

      if (enrollError) {
        if (enrollError.code === '23505') {
          // Already enrolled (unique constraint)
          setStatus('success');
          setMessage(`You're already enrolled in "${course.title}".`);
          setTimeout(() => navigate(`/courses/${course.id}`), 1200);
          return;
        }
        setStatus('error');
        setMessage(enrollError.message);
        return;
      }

      setStatus('success');
      setMessage(`Joined "${course.title}" (${course.semester}) successfully!`);
      setTimeout(() => navigate(`/courses/${course.id}`), 1200);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-auto custom-scrollbar">
      <header className="h-14 flex items-center px-8 border-b border-border-subtle shrink-0 bg-bg-surface">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-bg-surface border border-border-subtle rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-400" />
          
          <h1 className="text-2xl font-bold text-white mb-2">Join a Course</h1>
          <p className="text-text-muted text-sm mb-8">Enter the 6-character alphanumeric code shared by your instructor.</p>

          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="CS301A"
            disabled={status === 'loading' || status === 'success'}
            className="w-full text-center text-3xl font-mono tracking-widest bg-bg-panel border border-border-subtle rounded-xl py-4 text-white placeholder-text-muted/20 outline-none focus:border-brand-500 transition-colors uppercase mb-4"
          />

          {status === 'error' && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs mb-4">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-xs mb-4">
              <CheckCircle size={15} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={code.length < 6 || status === 'loading' || status === 'success'}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-bold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:shadow-none cursor-pointer"
          >
            {status === 'loading' ? 'Enrolling...' : 'Join Course'}
          </button>
        </div>
      </div>
    </div>
  );
};
