import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { useAuthStore } from '../../store/authStore';
import {
  GraduationCap, Plus, Users, Calendar, ArrowRight,
  BookOpen, FolderClosed, Sparkles, X, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CourseListPage = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInstructor = profile?.role === 'instructor';

  const loadCourses = async () => {
    setLoading(true);
    const { data, error } = await courseService.listMyCourses();
    if (error) {
      setError(typeof error === 'string' ? error : error.message);
    } else if (data) {
      setCourses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      queueMicrotask(() => {
        loadCourses();
      });
    }
  }, [profile]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !semester.trim()) return;

    setIsSubmitting(true);
    const { data, error } = await courseService.create(title.trim(), description.trim(), semester.trim());
    setIsSubmitting(false);

    if (error) {
      alert(`Error creating course: ${error}`);
    } else if (data) {
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setSemester('');
      loadCourses();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-auto custom-scrollbar p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="text-brand-500" size={26} />
            Institutional Portal
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {isInstructor 
              ? 'Manage your classrooms, rosters, assignments, and cohort performance.' 
              : 'Access courses, check upcoming deadlines, and submit your assembly exercises.'}
          </p>
        </div>

        {isInstructor ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus size={16} /> Create Course
          </button>
        ) : (
          <button
            onClick={() => navigate('/join')}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 text-sm font-bold rounded-xl transition-all border border-brand-500/20 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <PlusCircle size={16} /> Join with Code
          </button>
        )}
      </header>

      {/* Roster & Stats overview for instructors */}
      {isInstructor && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Active Courses</span>
              <span className="text-2xl font-bold text-white mt-0.5 block">{courses.length}</span>
            </div>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Total Enrolled</span>
              <span className="text-2xl font-bold text-white mt-0.5 block">
                {courses.reduce((sum, c) => sum + (c.course_enrollments?.[0]?.count || 0), 0)} students
              </span>
            </div>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Role Context</span>
              <span className="text-sm font-bold text-white mt-0.5 block capitalize">{profile?.role} Account</span>
            </div>
          </div>
        </div>
      )}

      {/* Courses List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-bg-surface border border-border-subtle rounded-2xl max-w-lg mx-auto">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadCourses} className="mt-4 px-4 py-2 bg-white/5 border border-border-subtle rounded-xl text-xs text-white">Retry</button>
        </div>
      ) : courses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-bg-surface border border-border-subtle rounded-2xl max-w-xl mx-auto w-full p-8 shadow-xl">
          <FolderClosed className="text-text-muted/30 mb-4" size={48} />
          <h3 className="text-lg font-bold text-white mb-2">No Courses Found</h3>
          <p className="text-xs text-text-muted max-w-xs mb-6">
            {isInstructor 
              ? 'Get started by creating a course. You can share your classroom join codes to enroll students.' 
              : 'You are not enrolled in any courses yet. Ask your instructor for the classroom join code.'}
          </p>
          {isInstructor ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl hover:bg-brand-600 cursor-pointer shadow-lg shadow-brand-500/10"
            >
              Create Your First Course
            </button>
          ) : (
            <button
              onClick={() => navigate('/join')}
              className="px-4 py-2 bg-brand-500/15 border border-brand-500/20 text-brand-400 text-xs font-bold rounded-xl hover:bg-brand-500/25 cursor-pointer"
            >
              Join Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const enrollCount = course.course_enrollments?.[0]?.count ?? 0;
            return (
              <motion.div
                key={course.id}
                layout
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl flex flex-col justify-between cursor-pointer hover:border-brand-500/40 hover:bg-white/[0.01] transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-500/20 group-hover:bg-brand-500 transition-colors" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono bg-bg-panel px-2.5 py-1 rounded-md border border-border-subtle text-text-muted font-bold flex items-center gap-1">
                      <Calendar size={10} />
                      {course.semester}
                    </span>
                    {isInstructor && (
                      <span className="text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                        {course.join_code}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-text-muted text-xs line-clamp-2 mb-6 min-h-[32px] leading-relaxed">
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle/50 pt-4 mt-auto text-xs text-text-muted font-medium">
                  {isInstructor ? (
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-brand-500" />
                      {enrollCount} student{enrollCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="italic">Enrolled</span>
                  )}
                  <span className="flex items-center gap-1 text-brand-400 font-bold group-hover:translate-x-1 transition-transform">
                    Enter Dashboard
                    <ArrowRight size={14} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-400" />
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <PlusCircle className="text-brand-500" size={18} />
                    Create New Course
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 text-text-muted hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Course Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., CS301: Computer Architecture"
                      className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Semester *</label>
                    <input
                      type="text"
                      required
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="e.g., Fall 2026, Spring 2027"
                      className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief overview of the course content"
                      rows={3}
                      className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border-subtle mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-2.5 border border-border-subtle rounded-xl text-text-muted text-xs font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !semester.trim()}
                      className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/10 cursor-pointer"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Course'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple alert placeholder
const AlertCircle = ({ className, size }: { className?: string, size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);
