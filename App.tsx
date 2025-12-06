import React, { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { StepIndicator } from './components/StepIndicator';
import { LogConsole } from './components/LogConsole';
import { FileExplorer } from './components/FileExplorer';
import { CodeBlock } from './components/CodeBlock';
import { Play, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { PipelineStep, LogEntry, Plan, CodePatch, Review } from './types';
import { architectAgent } from './services/agents/architect';
import { getContext, applyPatchToDisk } from './services/agents/fileops';
import { coderAgent } from './services/agents/coder';
import { reviewerAgent } from './services/agents/reviewer';

function App() {
  const [task, setTask] = useState('Add a Redis caching layer to src/handlers/api.ts');
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [vfsVersion, setVfsVersion] = useState(0); // Trigger to refresh file explorer
  
  // Pipeline State
  const [plan, setPlan] = useState<Plan | null>(null);
  const [patches, setPatches] = useState<CodePatch[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const addLog = useCallback((source: LogEntry['source'], message: string, type: LogEntry['type'] = 'info', details?: any) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      source,
      message,
      type,
      details
    }]);
  }, []);

  const runPipeline = async () => {
    if (pipelineStep !== 'IDLE' && pipelineStep !== 'DONE' && pipelineStep !== 'FAILED') return;
    
    setLogs([]);
    setPipelineStep('ARCHITECT');
    setPlan(null);
    setPatches([]);
    setReview(null);

    try {
      // 1. Architect
      addLog('Controller', 'Starting pipeline...', 'info');
      addLog('Architect', `Analyzing task: "${task}"`, 'info');
      const generatedPlan = await architectAgent(task);
      setPlan(generatedPlan);
      addLog('Architect', 'Plan created', 'success', { filesToEdit: generatedPlan.filesToEdit });
      
      // 2. FileOps (Context)
      setPipelineStep('FILEOPS');
      addLog('FileOps', 'Fetching context...', 'info');
      const context = await getContext(generatedPlan.filesToEdit);
      addLog('FileOps', `Retrieved ${context.length} file(s)`, 'success');

      // 3. Coder Loop
      let loopCount = 0;
      let currentReview: Review = { ok: false, issues: [] };
      let currentPatches: CodePatch[] = [];

      while(true) {
        loopCount++;
        setPipelineStep('CODER');
        addLog('Coder', `Generating patches (Pass ${loopCount})...`, 'info');
        
        // Pass context to Coder Agent so it knows about existing code
        currentPatches = await coderAgent(generatedPlan, context);
        setPatches(currentPatches);
        addLog('Coder', `Generated ${currentPatches.length} patch(es)`, 'success');

        // 4. Reviewer
        setPipelineStep('REVIEWER');
        addLog('Reviewer', 'Analyzing patches...', 'info');
        currentReview = await reviewerAgent(currentPatches);
        setReview(currentReview);

        if (currentReview.ok) {
            addLog('Reviewer', 'Review Passed!', 'success');
            break;
        } else {
            addLog('Reviewer', 'Issues found', 'warning', currentReview.issues);
            generatedPlan.metadata = { ...generatedPlan.metadata, fixes: currentReview.issues };
            
            if (loopCount >= 3) {
                addLog('Controller', 'Max loops reached. Aborting.', 'error');
                setPipelineStep('FAILED');
                return;
            }
            addLog('Controller', 'Re-queueing Coder with fixes...', 'info');
        }
      }

      // 5. Apply
      setPipelineStep('APPLYING');
      if (dryRun) {
          addLog('Controller', 'Dry Run mode: skipping disk write.', 'warning');
      } else {
          addLog('Controller', 'Applying changes to VFS...', 'info');
          const unified = currentPatches.map(p => p.diff).join('\n');
          const result = await applyPatchToDisk(unified, false);
          addLog('FileOps', result.message || 'Written', 'success');
          setVfsVersion(v => v + 1); // Refresh UI
      }
      
      setPipelineStep('DONE');
      addLog('Controller', 'Pipeline completed successfully.', 'success');

    } catch (e: any) {
      console.error(e);
      addLog('Controller', `Pipeline Error: ${e.message}`, 'error');
      setPipelineStep('FAILED');
    }
  };

  return (
    <Layout>
        {/* Left Sidebar - File Explorer */}
        <FileExplorer refreshTrigger={vfsVersion} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
            
            {/* Top Controls */}
            <div className="p-6 border-b border-slate-700 bg-surface/20">
                <StepIndicator currentStep={pipelineStep} />
                
                <div className="flex gap-4 mt-8">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
                            placeholder="Describe your coding task..."
                            disabled={pipelineStep !== 'IDLE' && pipelineStep !== 'DONE' && pipelineStep !== 'FAILED'}
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            PROMPT
                        </div>
                    </div>
                    <button 
                        onClick={runPipeline}
                        disabled={pipelineStep !== 'IDLE' && pipelineStep !== 'DONE' && pipelineStep !== 'FAILED'}
                        className={`px-6 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all
                            ${pipelineStep === 'IDLE' || pipelineStep === 'DONE' || pipelineStep === 'FAILED'
                                ? 'bg-primary hover:bg-blue-600 text-white' 
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    >
                        {pipelineStep === 'IDLE' || pipelineStep === 'DONE' || pipelineStep === 'FAILED' ? <Play size={18} /> : <RotateCcw size={18} className="animate-spin" />}
                        {pipelineStep === 'IDLE' || pipelineStep === 'DONE' || pipelineStep === 'FAILED' ? 'Run Pipeline' : 'Running...'}
                    </button>
                </div>
                
                <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                        <input 
                            type="checkbox" 
                            checked={dryRun} 
                            onChange={e => setDryRun(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-0"
                        />
                        <span>Dry Run (No Write)</span>
                    </label>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
                
                {/* Column 1: Plan & Logs */}
                <div className="flex flex-col gap-6">
                    {/* Plan Card */}
                    <div className="bg-surface rounded-xl border border-slate-700 p-4 shadow-xl">
                        <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                            <RotateCcw size={14} className="text-purple-400"/>
                            EXECUTION PLAN
                        </h2>
                        {plan ? (
                            <div className="space-y-3">
                                <div className="text-xs text-slate-400">Files identified:</div>
                                <div className="flex gap-2 flex-wrap">
                                    {plan.filesToEdit.map(f => (
                                        <span key={f} className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300 font-mono">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                                <div className="h-px bg-slate-700 my-2" />
                                <ol className="list-decimal list-inside text-sm text-slate-400 space-y-1">
                                    {plan.steps.map((s, i) => <li key={i}>{s}</li>)}
                                </ol>
                            </div>
                        ) : (
                            <div className="h-24 flex items-center justify-center text-slate-600 text-sm italic border-2 border-dashed border-slate-800 rounded">
                                Waiting for Architect...
                            </div>
                        )}
                    </div>

                    <LogConsole logs={logs} />
                </div>

                {/* Column 2: Code Patch Preview */}
                <div className="flex flex-col gap-6 h-full min-h-[400px]">
                    <div className="bg-surface rounded-xl border border-slate-700 p-4 shadow-xl flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <Save size={14} className="text-blue-400"/>
                                GENERATED PATCH
                            </h2>
                            {review && (
                                <span className={`text-xs px-2 py-1 rounded font-bold ${review.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {review.ok ? 'REVIEW PASSED' : 'REVIEW FAILED'}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
                            {patches.length > 0 ? (
                                <div className="absolute inset-0 overflow-auto">
                                    {patches.map((patch, idx) => (
                                        <div key={idx} className="mb-4">
                                            <div className="bg-slate-800 px-3 py-1 text-xs text-slate-400 font-mono border-b border-slate-700">
                                                {patch.filePath}
                                            </div>
                                            <CodeBlock code={patch.diff} className="border-none rounded-none" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                                    No patches generated yet.
                                </div>
                            )}
                        </div>
                        
                        {review && !review.ok && (
                             <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded p-3">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                                    <AlertCircle size={14} /> ISSUES DETECTED
                                </div>
                                <ul className="list-disc list-inside text-xs text-red-300/80">
                                    {review.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                </ul>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </Layout>
  );
}

export default App;