import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, GraduationCap } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Architecture Simulator',
    content: 'This tool helps you understand how a MIPS processor works under the hood. You can write assembly code, simulate its execution, and visualize the pipeline and datapath.',
    position: 'center'
  },
  {
    title: 'The Code Editor',
    content: 'Write your MIPS assembly code here. You can click on the Examples tab to load pre-written programs. The editor supports syntax highlighting and error checking.',
    position: 'left'
  },
  {
    title: 'The Pipeline Canvas',
    content: 'Watch your instructions flow through the 5-stage pipeline (IF, ID, EX, MEM, WB). You can see stalls, bubbles, and forwarding in real-time.',
    position: 'center'
  },
  {
    title: 'The Datapath View',
    content: 'Switch to the Datapath tab to see the physical hardware layout. Data chips travel along the wires, showing you exactly how values are computed and stored.',
    position: 'center'
  },
  {
    title: 'Execution Controls',
    content: 'Use the controls in the bottom right to step forward, step backward, or auto-play the simulation. The simulation history is saved so you can reverse time!',
    position: 'bottom-right'
  },
  {
    title: 'What-If Analysis',
    content: 'Go to the Diff tab to compare how your code performs with and without optimizations like Data Forwarding or different Branch Predictors.',
    position: 'center'
  }
];

export const TutorialOverlay = ({ onClose }: { onClose: () => void }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`relative bg-bg-surface border border-brand-500/50 shadow-2xl rounded-2xl w-[400px] pointer-events-auto overflow-hidden
            ${step.position === 'left' ? 'mr-auto ml-10' : ''}
            ${step.position === 'bottom-right' ? 'ml-auto mt-auto mb-10 mr-10' : ''}
          `}
        >
          <div className="bg-brand-500/10 px-6 py-4 border-b border-brand-500/20 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <GraduationCap size={18} className="text-brand-400" />
              {step.title}
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="p-6">
            <p className="text-text-main text-sm leading-relaxed mb-8">
              {step.content}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-4 bg-brand-400' : 'w-1.5 bg-border-subtle'}`}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
                  disabled={stepIndex === 0}
                  className="p-2 text-text-muted hover:text-white disabled:opacity-30 disabled:hover:text-text-muted transition-colors rounded-lg hover:bg-white/5"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    if (stepIndex === TUTORIAL_STEPS.length - 1) {
                      onClose();
                    } else {
                      setStepIndex(stepIndex + 1);
                    }
                  }}
                  className="flex items-center gap-1 px-4 py-1.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-brand-500/20"
                >
                  {stepIndex === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
                  {stepIndex !== TUTORIAL_STEPS.length - 1 && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
