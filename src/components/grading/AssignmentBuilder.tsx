import { useState, useMemo } from 'react';
import {
  Plus, Trash2, GripVertical, FileText, BarChart3, TestTubes,
  Code2, Eye, Shield, Calendar, Clock, ChevronRight, ChevronLeft,
  Save, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import type { AssignmentProfile, TestCase } from '../../engine/assignmentProfile';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helper to generate IDs ──────────────────────────────────────────────
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Tab Steps ────────────────────────────────────────────────────────────
const WIZARD_STEPS = ['Specification', 'Rubric', 'Test Cases', 'Starter Code', 'Review'] as const;
type WizardStep = typeof WIZARD_STEPS[number];

const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  'Specification': <FileText size={14} />,
  'Rubric': <BarChart3 size={14} />,
  'Test Cases': <TestTubes size={14} />,
  'Starter Code': <Code2 size={14} />,
  'Review': <Eye size={14} />,
};

// ── Main Component ───────────────────────────────────────────────────────

interface Props {
  initial?: AssignmentProfile;
  onSave: (assignment: AssignmentProfile) => void;
  onCancel: () => void;
}

export const AssignmentBuilder = ({ initial, onSave, onCancel }: Props) => {
  const isEditing = !!initial;
  const [currentStep, setCurrentStep] = useState<WizardStep>('Specification');

  // Form state
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [specification, setSpecification] = useState(initial?.specification || '');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(initial?.difficulty || 'Intermediate');
  const [starterCode, setStarterCode] = useState(initial?.starterCode || `# Student code goes here\n.text\nmain:\n  # Your code here\n  \n  li $v0, 10\n  syscall\n`);
  const [blockedInstructions, setBlockedInstructions] = useState<string[]>(initial?.blockedInstructions || []);
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimit || 0);
  const [testCases, setTestCases] = useState<TestCase[]>(initial?.testCases || []);
  const [rubric, setRubric] = useState(initial?.rubric || { correctness: 50, efficiency: 30, style: 20 });
  const [newBlockedInstr, setNewBlockedInstr] = useState('');

  const stepIndex = WIZARD_STEPS.indexOf(currentStep);
  const canPrev = stepIndex > 0;
  const canNext = stepIndex < WIZARD_STEPS.length - 1;
  const rubricTotal = rubric.correctness + rubric.efficiency + rubric.style;

  const isValid = useMemo(() => {
    return title.trim().length > 0 && rubricTotal === 100 && testCases.length > 0;
  }, [title, rubricTotal, testCases]);

  const handleSave = () => {
    const assignment: AssignmentProfile = {
      id: initial?.id || `custom-${genId()}`,
      title: title.trim(),
      description: description.trim(),
      specification: specification.trim(),
      difficulty,
      starterCode,
      blockedInstructions,
      dueDate: dueDate || undefined,
      timeLimit: timeLimit || undefined,
      testCases,
      rubric,
    };
    onSave(assignment);
  };

  const addTestCase = () => {
    setTestCases([...testCases, {
      id: `tc-${genId()}`,
      name: `Test Case ${testCases.length + 1}`,
      description: '',
      expected: {},
      weight: 10,
    }]);
  };

  const updateTestCase = (index: number, updated: Partial<TestCase>) => {
    setTestCases(testCases.map((tc, i) => i === index ? { ...tc, ...updated } : tc));
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const addBlockedInstruction = () => {
    const instr = newBlockedInstr.trim().toLowerCase();
    if (instr && !blockedInstructions.includes(instr)) {
      setBlockedInstructions([...blockedInstructions, instr]);
      setNewBlockedInstr('');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Wizard Step Bar */}
      <div className="flex items-center gap-1 px-6 py-3 bg-bg-surface border-b border-border-subtle overflow-x-auto">
        {WIZARD_STEPS.map((step, i) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              step === currentStep
                ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                : i < stepIndex
                  ? 'text-emerald-400 hover:bg-white/5'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {i < stepIndex ? <CheckCircle2 size={13} className="text-emerald-400" /> : STEP_ICONS[step]}
            {step}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Step 1: Specification ── */}
            {currentStep === 'Specification' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-white mb-2">Assignment Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Lab 3: Pipeline Hazards & Forwarding"
                    className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-xl text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-2">Short Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description for the assignment list"
                    className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-xl text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-2">Full Specification</label>
                  <p className="text-[11px] text-text-muted mb-2">Write detailed instructions for students. Supports plain text.</p>
                  <textarea
                    value={specification}
                    onChange={(e) => setSpecification(e.target.value)}
                    placeholder="Write the full assignment instructions here...&#10;&#10;Objectives:&#10;- Understand data hazards&#10;- Practice instruction reordering&#10;&#10;Requirements:&#10;1. Modify the given code to eliminate all stalls..."
                    rows={10}
                    className="w-full px-4 py-3 bg-bg-base border border-border-subtle rounded-xl text-white text-sm font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-500 transition-colors resize-y leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                      className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Beginner">🟢 Beginner</option>
                      <option value="Intermediate">🟡 Intermediate</option>
                      <option value="Advanced">🔴 Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <Calendar size={12} /> Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                    <Clock size={12} /> Time Limit (minutes, 0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-32 px-4 py-2.5 bg-bg-base border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                {/* Blocked Instructions */}
                <div>
                  <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                    <Shield size={12} /> Blocked Instructions
                  </label>
                  <p className="text-[11px] text-text-muted mb-2">Instructions students are not allowed to use.</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newBlockedInstr}
                      onChange={(e) => setNewBlockedInstr(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addBlockedInstruction()}
                      placeholder="e.g., mult, div"
                      className="flex-1 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-white text-xs focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <button
                      onClick={addBlockedInstruction}
                      className="px-3 py-2 bg-brand-500/10 text-brand-400 text-xs rounded-lg hover:bg-brand-500/20 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {blockedInstructions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {blockedInstructions.map((instr) => (
                        <span key={instr} className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-md border border-red-500/20">
                          <code>{instr}</code>
                          <button onClick={() => setBlockedInstructions(blockedInstructions.filter(i => i !== instr))} className="hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Rubric ── */}
            {currentStep === 'Rubric' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Grading Rubric</h3>
                  <p className="text-xs text-text-muted mb-4">Set the weight for each grading category. Total must equal 100%.</p>
                </div>

                {/* Rubric Sliders */}
                <div className="space-y-5">
                  <RubricSlider
                    label="Correctness"
                    description="Passing test cases"
                    value={rubric.correctness}
                    color="bg-emerald-500"
                    onChange={(v) => setRubric({ ...rubric, correctness: v })}
                  />
                  <RubricSlider
                    label="Efficiency"
                    description="Cycle count, stalls, CPI"
                    value={rubric.efficiency}
                    color="bg-brand-500"
                    onChange={(v) => setRubric({ ...rubric, efficiency: v })}
                  />
                  <RubricSlider
                    label="Style"
                    description="Comments, formatting, clarity"
                    value={rubric.style}
                    color="bg-purple-500"
                    onChange={(v) => setRubric({ ...rubric, style: v })}
                  />
                </div>

                {/* Total indicator */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  rubricTotal === 100
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <span className="text-sm font-bold text-white">Total Weight</span>
                  <span className={`text-lg font-bold ${rubricTotal === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {rubricTotal}%
                    {rubricTotal === 100
                      ? <CheckCircle2 size={16} className="inline ml-2" />
                      : <AlertTriangle size={16} className="inline ml-2" />
                    }
                  </span>
                </div>

                {/* Distribution ring */}
                <div className="flex justify-center">
                  <svg viewBox="0 0 36 36" className="w-28 h-28">
                    <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="#1e293b" />
                    <circle
                      cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="#10b981"
                      strokeDasharray={`${rubric.correctness * 0.88} ${88 - rubric.correctness * 0.88}`}
                      strokeDashoffset="22" strokeLinecap="round"
                    />
                    <circle
                      cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="#3b82f6"
                      strokeDasharray={`${rubric.efficiency * 0.88} ${88 - rubric.efficiency * 0.88}`}
                      strokeDashoffset={`${22 - rubric.correctness * 0.88}`} strokeLinecap="round"
                    />
                    <circle
                      cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="#a855f7"
                      strokeDasharray={`${rubric.style * 0.88} ${88 - rubric.style * 0.88}`}
                      strokeDashoffset={`${22 - (rubric.correctness + rubric.efficiency) * 0.88}`} strokeLinecap="round"
                    />
                    <text x="18" y="20" textAnchor="middle" className="text-[6px] fill-white font-bold">{rubricTotal}%</text>
                  </svg>
                </div>
              </div>
            )}

            {/* ── Step 3: Test Cases ── */}
            {currentStep === 'Test Cases' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Test Cases</h3>
                    <p className="text-xs text-text-muted">Define inputs and expected outputs for auto-grading.</p>
                  </div>
                  <button
                    onClick={addTestCase}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-500/15 text-brand-400 text-xs font-bold rounded-lg hover:bg-brand-500/25 transition-colors"
                  >
                    <Plus size={13} /> Add Test Case
                  </button>
                </div>

                {testCases.length === 0 && (
                  <div className="text-center py-10 text-text-muted">
                    <TestTubes size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No test cases yet</p>
                    <p className="text-xs mt-1">Click "Add Test Case" to create your first one</p>
                  </div>
                )}

                {testCases.map((tc, idx) => (
                  <TestCaseCard
                    key={tc.id}
                    testCase={tc}
                    index={idx}
                    onChange={(updated) => updateTestCase(idx, updated)}
                    onRemove={() => removeTestCase(idx)}
                  />
                ))}
              </div>
            )}

            {/* ── Step 4: Starter Code ── */}
            {currentStep === 'Starter Code' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Starter Code</h3>
                  <p className="text-xs text-text-muted mb-3">MIPS assembly code that students start with. Include TODO comments to guide them.</p>
                </div>
                <textarea
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  rows={20}
                  spellCheck={false}
                  className="w-full px-4 py-3 bg-bg-base border border-border-subtle rounded-xl text-emerald-300 text-sm font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-500 transition-colors resize-y leading-relaxed"
                />
              </div>
            )}

            {/* ── Step 5: Review ── */}
            {currentStep === 'Review' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-white">Review Assignment</h3>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Title</span>
                    <p className="text-sm text-white font-medium mt-1">{title || '(untitled)'}</p>
                  </div>
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Difficulty</span>
                    <p className="text-sm text-white font-medium mt-1">{difficulty}</p>
                  </div>
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Test Cases</span>
                    <p className="text-sm text-white font-medium mt-1">{testCases.length} test{testCases.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Rubric</span>
                    <p className={`text-sm font-medium mt-1 ${rubricTotal === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {rubric.correctness}/{rubric.efficiency}/{rubric.style}
                    </p>
                  </div>
                </div>

                {blockedInstructions.length > 0 && (
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Blocked Instructions</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {blockedInstructions.map(i => (
                        <code key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">{i}</code>
                      ))}
                    </div>
                  </div>
                )}

                {specification && (
                  <div className="bg-bg-base border border-border-subtle rounded-xl p-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Specification Preview</span>
                    <pre className="text-xs text-text-main mt-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                      {specification}
                    </pre>
                  </div>
                )}

                {/* Validation */}
                <div className="space-y-2">
                  {!title.trim() && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> Title is required</p>
                  )}
                  {rubricTotal !== 100 && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> Rubric weights must total 100% (currently {rubricTotal}%)</p>
                  )}
                  {testCases.length === 0 && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> At least one test case is required</p>
                  )}
                  {isValid && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> Assignment is ready to save</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-bg-surface border-t border-border-subtle">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-muted text-xs hover:text-white transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {canPrev && (
            <button
              onClick={() => setCurrentStep(WIZARD_STEPS[stepIndex - 1])}
              className="flex items-center gap-1 px-4 py-2 text-text-muted text-xs hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {canNext ? (
            <button
              onClick={() => setCurrentStep(WIZARD_STEPS[stepIndex + 1])}
              className="flex items-center gap-1 px-5 py-2 bg-brand-500/15 text-brand-400 text-xs font-bold rounded-lg hover:bg-brand-500/25 transition-all"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-brand-500/20"
            >
              <Save size={14} /> {isEditing ? 'Update' : 'Create'} Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Rubric Slider Component ──────────────────────────────────────────────

function RubricSlider({
  label, description, value, color, onChange,
}: {
  label: string; description: string; value: number; color: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-xs text-text-muted ml-2">— {description}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            min={0}
            max={100}
            className="w-14 px-2 py-1 bg-bg-base border border-border-subtle rounded-md text-white text-xs text-center focus:outline-none focus:border-brand-500"
          />
          <span className="text-xs text-text-muted">%</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        min={0}
        max={100}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand-500"
        style={{
          background: `linear-gradient(to right, ${color === 'bg-emerald-500' ? '#10b981' : color === 'bg-brand-500' ? '#3b82f6' : '#a855f7'} ${value}%, #1e293b ${value}%)`,
        }}
      />
    </div>
  );
}

// ── Test Case Card ───────────────────────────────────────────────────────

function TestCaseCard({
  testCase, index, onChange, onRemove,
}: {
  testCase: TestCase; index: number; onChange: (updated: Partial<TestCase>) => void; onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [regName, setRegName] = useState('');
  const [regValue, setRegValue] = useState('');

  const addExpectedRegister = () => {
    if (!regName.trim()) return;
    const reg = regName.trim().startsWith('$') ? regName.trim() : `$${regName.trim()}`;
    const val = parseInt(regValue.trim()) || 0;
    onChange({
      expected: {
        ...testCase.expected,
        registers: { ...(testCase.expected.registers || {}), [reg]: val },
      },
    });
    setRegName('');
    setRegValue('');
  };

  const removeExpectedRegister = (reg: string) => {
    const updated = { ...testCase.expected.registers };
    delete updated[reg];
    onChange({
      expected: {
        ...testCase.expected,
        registers: Object.keys(updated).length > 0 ? updated : undefined,
      },
    });
  };

  return (
    <div className="bg-bg-base border border-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpanded(!expanded)}>
        <GripVertical size={13} className="text-text-muted" />
        <span className="text-xs font-bold text-white flex-1">
          #{index + 1} — {testCase.name || 'Untitled Test'}
        </span>
        <span className="text-[10px] text-text-muted px-2 py-0.5 bg-white/5 rounded">
          {testCase.weight}pts
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-text-muted hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
          {/* Name & Weight */}
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">Test Name</label>
              <input
                type="text"
                value={testCase.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-1.5 bg-bg-panel border border-border-subtle rounded-lg text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">Weight</label>
              <input
                type="number"
                value={testCase.weight}
                onChange={(e) => onChange({ weight: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-3 py-1.5 bg-bg-panel border border-border-subtle rounded-lg text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">Description</label>
            <input
              type="text"
              value={testCase.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="What does this test verify?"
              className="w-full px-3 py-1.5 bg-bg-panel border border-border-subtle rounded-lg text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Expected Registers */}
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">Expected Register Values</label>
            {testCase.expected.registers && Object.entries(testCase.expected.registers).map(([reg, val]) => (
              <div key={reg} className="flex items-center gap-2 mb-1">
                <code className="text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">{reg}</code>
                <span className="text-xs text-text-muted">=</span>
                <span className="text-xs text-white font-mono">{val}</span>
                <button onClick={() => removeExpectedRegister(reg)} className="text-text-muted hover:text-red-400 ml-1"><Trash2 size={10} /></button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="$t0"
                className="w-20 px-2 py-1 bg-bg-panel border border-border-subtle rounded text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <span className="text-xs text-text-muted">=</span>
              <input
                type="text"
                value={regValue}
                onChange={(e) => setRegValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExpectedRegister()}
                placeholder="value"
                className="w-24 px-2 py-1 bg-bg-panel border border-border-subtle rounded text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={addExpectedRegister}
                className="px-2 py-1 bg-brand-500/10 text-brand-400 text-[10px] rounded hover:bg-brand-500/20"
              >
                Add
              </button>
            </div>
          </div>

          {/* Performance constraints */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">Max Cycles (0 = no limit)</label>
              <input
                type="number"
                value={testCase.expected.maxCycles || 0}
                onChange={(e) => onChange({ expected: { ...testCase.expected, maxCycles: parseInt(e.target.value) || undefined } })}
                min={0}
                className="w-full px-3 py-1.5 bg-bg-panel border border-border-subtle rounded-lg text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">Max Stalls (0 = no limit)</label>
              <input
                type="number"
                value={testCase.expected.maxStalls || 0}
                onChange={(e) => onChange({ expected: { ...testCase.expected, maxStalls: parseInt(e.target.value) || undefined } })}
                min={0}
                className="w-full px-3 py-1.5 bg-bg-panel border border-border-subtle rounded-lg text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
