import React from 'react';
import { PipelineStep } from '../types';
import { Bot, FileCode, CheckCircle2, PencilRuler, Play } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: PipelineStep;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps: { id: PipelineStep; label: string; icon: React.FC<any> }[] = [
    { id: 'ARCHITECT', label: 'Architect', icon: PencilRuler },
    { id: 'FILEOPS', label: 'Context', icon: FileCode },
    { id: 'CODER', label: 'Coder', icon: Bot },
    { id: 'REVIEWER', label: 'Reviewer', icon: CheckCircle2 },
    { id: 'APPLYING', label: 'Apply', icon: Play },
  ];

  const getStatusColor = (stepId: PipelineStep) => {
    const stepOrder = steps.findIndex(s => s.id === stepId);
    const currentOrder = steps.findIndex(s => s.id === currentStep);
    
    if (currentStep === 'DONE' || currentStep === 'FAILED') {
         if (currentStep === 'FAILED') return 'text-red-500 opacity-50';
         return 'text-success';
    }

    if (currentOrder === stepOrder) return 'text-primary animate-pulse scale-110';
    if (currentOrder > stepOrder) return 'text-success';
    return 'text-slate-600';
  };

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-8 px-4">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex flex-col items-center gap-2 relative z-0">
          {/* Connector Line */}
          {idx !== 0 && (
            <div className={`absolute top-3 -left-[50%] w-full h-0.5 -z-10 
              ${steps.findIndex(s => s.id === currentStep) >= idx || currentStep === 'DONE' ? 'bg-slate-600' : 'bg-slate-800'}`} 
            />
          )}
          
          <div className={`transition-all duration-300 ${getStatusColor(step.id)} bg-surface p-2 rounded-full border border-slate-700/50`}>
            <step.icon size={20} />
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${getStatusColor(step.id)}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};