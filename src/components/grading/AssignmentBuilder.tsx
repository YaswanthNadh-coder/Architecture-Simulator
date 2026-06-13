import { useState, useRef } from 'react';
import { Download, Upload, Plus, Trash2, Save, FileJson } from 'lucide-react';
import type { AssignmentProfile, TestCase } from '../../engine/assignmentProfile';
import { useAssignmentStore } from '../../store/assignmentStore';

export const AssignmentBuilder = ({
  onSelectAssignment,
}: {
  onSelectAssignment: (id: string) => void;
}) => {
  const { importAssignments, customAssignments, deleteAssignment } = useAssignmentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState(`custom-${Math.random().toString(36).slice(2, 8)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [starterCode, setStarterCode] = useState('');
  
  const [rubric, setRubric] = useState({ correctness: 50, efficiency: 30, style: 20 });
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const loadAssignment = (assignmentId: string) => {
    if (assignmentId === 'new') {
      setId(`custom-${Math.random().toString(36).slice(2, 8)}`);
      setTitle('');
      setDescription('');
      setDifficulty('Intermediate');
      setStarterCode('');
      setRubric({ correctness: 50, efficiency: 30, style: 20 });
      setTestCases([]);
      return;
    }
    const a = customAssignments.find(a => a.id === assignmentId);
    if (a) {
      setId(a.id);
      setTitle(a.title);
      setDescription(a.description);
      setDifficulty(a.difficulty);
      setStarterCode(a.starterCode);
      setRubric(a.rubric);
      setTestCases(a.testCases);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: `tc-${Math.random().toString(36).slice(2, 8)}`,
        name: 'New Test Case',
        description: '',
        weight: 10,
        expected: {},
      },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, updates: Partial<TestCase>) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], ...updates };
    setTestCases(updated);
  };

  const handleSave = () => {
    if (!title) {
      alert('Title is required');
      return;
    }
    const assignment: AssignmentProfile = {
      id,
      title,
      description,
      difficulty,
      starterCode,
      rubric,
      testCases,
    };
    
    importAssignments([assignment]);
    
    alert('Assignment saved!');
    onSelectAssignment(assignment.id);
  };

  const handleExport = () => {
    const assignment: AssignmentProfile = {
      id, title, description, difficulty, starterCode, rubric, testCases
    };
    const blob = new Blob([JSON.stringify(assignment, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.id && data.title) {
          setId(data.id);
          setTitle(data.title);
          setDescription(data.description || '');
          setDifficulty(data.difficulty || 'Intermediate');
          setStarterCode(data.starterCode || '');
          setRubric(data.rubric || { correctness: 50, efficiency: 30, style: 20 });
          setTestCases(data.testCases || []);
        }
      } catch (err) {
        alert('Failed to parse JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-6">
      {customAssignments.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">Edit Existing Assignment:</span>
            <select
              onChange={(e) => loadAssignment(e.target.value)}
              className="bg-bg-panel border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 transition-colors min-w-[200px]"
              value={customAssignments.some(a => a.id === id) ? id : 'new'}
            >
              <option value="new">-- Create New --</option>
              {customAssignments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          {customAssignments.some(a => a.id === id) && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this assignment?')) {
                  deleteAssignment(id);
                  loadAssignment('new');
                }
              }}
              className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 transition-colors px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 rounded-lg border border-red-400/20"
            >
              <Trash2 size={14} /> Delete Assignment
            </button>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-8">
        {/* Left side: Basic Info & Code */}
        <div className="flex flex-col gap-6">
         <div className="bg-bg-surface border border-border-subtle rounded-xl p-6">
           <h3 className="text-sm font-bold text-white mb-4">General Settings</h3>
           
           <div className="space-y-4">
             <div>
               <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Title</label>
               <input 
                 value={title} onChange={e => setTitle(e.target.value)}
                 className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500 transition-colors"
                 placeholder="e.g., Lab 5: Loops and Arrays"
               />
             </div>
             
             <div>
               <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Description</label>
               <textarea 
                 value={description} onChange={e => setDescription(e.target.value)}
                 className="w-full h-24 bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500 transition-colors resize-none"
                 placeholder="Describe the task..."
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Difficulty</label>
                 <select 
                   value={difficulty} onChange={e => setDifficulty(e.target.value as any)}
                   className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500 transition-colors"
                 >
                   <option value="Beginner">Beginner</option>
                   <option value="Intermediate">Intermediate</option>
                   <option value="Advanced">Advanced</option>
                 </select>
               </div>
               <div>
                 <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">ID (Internal)</label>
                 <input 
                   value={id} onChange={e => setId(e.target.value)}
                   className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-muted outline-none font-mono"
                 />
               </div>
             </div>
           </div>
         </div>

         <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex-1 flex flex-col">
           <h3 className="text-sm font-bold text-white mb-4">Starter Code</h3>
           <textarea 
             value={starterCode} onChange={e => setStarterCode(e.target.value)}
             className="flex-1 w-full min-h-[200px] bg-bg-panel border border-border-subtle rounded-lg p-3 text-xs text-text-main font-mono outline-none focus:border-brand-500 transition-colors resize-none custom-scrollbar"
             placeholder=".text\nmain:\n  # Starter code here..."
             spellCheck={false}
           />
         </div>
       </div>

       {/* Right side: Rubric & Test Cases */}
       <div className="flex flex-col gap-6">
         <div className="bg-bg-surface border border-border-subtle rounded-xl p-6">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-white">Rubric Weights (%)</h3>
             <span className={`text-xs font-bold ${rubric.correctness + rubric.efficiency + rubric.style === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
               Total: {rubric.correctness + rubric.efficiency + rubric.style}%
             </span>
           </div>
           
           <div className="grid grid-cols-3 gap-4">
             <div>
               <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Correctness</label>
               <input type="number" value={rubric.correctness} onChange={e => setRubric({...rubric, correctness: parseInt(e.target.value) || 0})} className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white" />
             </div>
             <div>
               <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Efficiency</label>
               <input type="number" value={rubric.efficiency} onChange={e => setRubric({...rubric, efficiency: parseInt(e.target.value) || 0})} className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white" />
             </div>
             <div>
               <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">Style</label>
               <input type="number" value={rubric.style} onChange={e => setRubric({...rubric, style: parseInt(e.target.value) || 0})} className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white" />
             </div>
           </div>
         </div>

         <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex-1 flex flex-col min-h-0">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-white">Test Cases</h3>
             <button onClick={handleAddTestCase} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-bold transition-colors">
               <Plus size={14} /> Add Test
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
             {testCases.map((tc, index) => (
               <TestCaseEditor 
                 key={tc.id} 
                 tc={tc} 
                 index={index} 
                 onUpdate={handleUpdateTestCase} 
                 onRemove={handleRemoveTestCase} 
               />
             ))}
             {testCases.length === 0 && (
               <div className="text-center p-6 border border-dashed border-border-subtle rounded-lg">
                 <p className="text-xs text-text-muted mb-2">No test cases defined.</p>
                 <p className="text-[10px] text-text-muted/60">Auto-grader requires at least one test case.</p>
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Bottom Actions */}
       <div className="col-span-2 flex justify-end gap-3 mt-4">
         <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
         <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-bg-surface hover:bg-bg-panel text-white text-xs font-bold rounded-lg border border-border-subtle transition-colors flex items-center gap-2">
           <Upload size={14} /> Import JSON
         </button>
         <button onClick={handleExport} className="px-4 py-2 bg-bg-surface hover:bg-bg-panel text-white text-xs font-bold rounded-lg border border-border-subtle transition-colors flex items-center gap-2">
           <Download size={14} /> Export JSON
         </button>
         <button onClick={handleSave} className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-colors flex items-center gap-2">
           <Save size={14} /> Save to Library
         </button>
       </div>
      </div>
    </div>
  );
};

const TestCaseEditor = ({
  tc,
  index,
  onUpdate,
  onRemove,
}: {
  tc: TestCase;
  index: number;
  onUpdate: (index: number, updates: Partial<TestCase>) => void;
  onRemove: (index: number) => void;
}) => {
  const [rawRegs, setRawRegs] = useState(() => JSON.stringify(tc.expected.registers || {}, null, 2));
  const [rawMem, setRawMem] = useState(() => JSON.stringify(tc.expected.memory || {}, null, 2));

  const handleRegsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawRegs(val);
    try {
      const parsed = JSON.parse(val);
      onUpdate(index, { expected: { ...tc.expected, registers: parsed } });
    } catch (err) {
      // Invalid JSON, just wait for the user to fix it
    }
  };

  const handleMemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawMem(val);
    try {
      const parsed = JSON.parse(val);
      onUpdate(index, { expected: { ...tc.expected, memory: parsed } });
    } catch (err) {
      // Invalid JSON, just wait
    }
  };

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <input 
          value={tc.name} onChange={e => onUpdate(index, { name: e.target.value })}
          className="bg-transparent border-none text-sm font-bold text-white outline-none w-2/3"
          placeholder="Test Case Name"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <input 
              type="number" value={tc.weight} onChange={e => onUpdate(index, { weight: parseInt(e.target.value) || 0 })}
              className="w-12 bg-bg-base border border-border-subtle rounded px-1.5 py-0.5 text-xs text-white text-center"
            />
            <span className="text-[10px] text-text-muted uppercase">pts</span>
          </div>
          <button onClick={() => onRemove(index)} className="text-text-muted hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <textarea 
        value={tc.description} onChange={e => onUpdate(index, { description: e.target.value })}
        className="w-full h-10 bg-bg-base border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-white outline-none mb-3 resize-none"
        placeholder="Description..."
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[9px] text-text-muted uppercase tracking-wider font-bold mb-1">Expected Registers (JSON)</label>
          <textarea 
            value={rawRegs} 
            onChange={handleRegsChange}
            className="w-full h-20 bg-bg-base border border-border-subtle rounded-lg p-2 text-[10px] text-brand-300 font-mono outline-none resize-none custom-scrollbar"
            placeholder='{"$v0": 15}'
          />
        </div>
        <div>
          <label className="block text-[9px] text-text-muted uppercase tracking-wider font-bold mb-1">Expected Memory (JSON)</label>
          <textarea 
            value={rawMem} 
            onChange={handleMemChange}
            className="w-full h-20 bg-bg-base border border-border-subtle rounded-lg p-2 text-[10px] text-cyan-300 font-mono outline-none resize-none custom-scrollbar"
            placeholder='{"268500992": 15}'
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] text-text-muted uppercase tracking-wider font-bold mb-1">Max Cycles (Optional)</label>
          <input type="number" value={tc.expected.maxCycles || ''} onChange={e => onUpdate(index, { expected: { ...tc.expected, maxCycles: parseInt(e.target.value) || undefined }})} className="w-full bg-bg-base border border-border-subtle rounded-lg px-2 py-1 text-xs text-white" />
        </div>
        <div>
          <label className="block text-[9px] text-text-muted uppercase tracking-wider font-bold mb-1">Max Stalls (Optional)</label>
          <input type="number" value={tc.expected.maxStalls || ''} onChange={e => onUpdate(index, { expected: { ...tc.expected, maxStalls: parseInt(e.target.value) || undefined }})} className="w-full bg-bg-base border border-border-subtle rounded-lg px-2 py-1 text-xs text-white" />
        </div>
      </div>

    </div>
  );
};
