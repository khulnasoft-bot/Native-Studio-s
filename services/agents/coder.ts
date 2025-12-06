import { CodePatch, Plan, FileContext } from '../../types';
import { ai, MODELS } from '../llm';
import { SYSTEM_PROMPTS } from '../prompts';
import { createUnifiedDiff } from '../diffUtils';
import { vfs } from '../mockFileSystem';

export async function coderAgent(plan: Plan, context: FileContext[]): Promise<CodePatch[]> {
  const patches: CodePatch[] = [];

  // Gather Project Context
  // 1. File Structure
  const allFiles = vfs.getAllFiles();
  const fileTree = allFiles.map(f => `- ${f.path}`).join('\n');

  // 2. Dependencies from package.json
  let projectDependencies = "None detected";
  try {
    if (await vfs.exists('package.json')) {
      const pkgContent = await vfs.readFile('package.json');
      const pkg = JSON.parse(pkgContent);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (Object.keys(deps).length > 0) {
        projectDependencies = Object.entries(deps)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      }
    }
  } catch (e) {
    console.warn("Failed to parse package.json for context", e);
  }

  // Construct a context string for the LLM
  const fileContextStr = context.map(f => 
    `--- START OF FILE ${f.path} ---\n${f.content}\n--- END OF FILE ${f.path} ---`
  ).join('\n\n');

  const prompt = `
TASK: ${plan.task}

PROJECT CONTEXT:
File Structure:
${fileTree}

Detected Dependencies:
${projectDependencies}

PLAN STEPS:
${plan.steps.map(s => `- ${s}`).join('\n')}

AVAILABLE FILE CONTEXT:
${fileContextStr}

INSTRUCTIONS:
Generate a unified diff for the necessary changes. 
If modifying multiple files, separate the diffs clearly.
Ensure you respect the existing code style.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.coder, // Using gemini-3-pro for better coding capabilities
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPTS.CODER,
        // We do NOT use JSON schema here because we want raw Diff text output
        // which handles whitespace and symbols better than JSON strings
      }
    });

    const rawOutput = response.text || "";
    
    // Parse the raw output to separate patches per file
    // The LLM is instructed to output standard Unified Diff format
    // We can rely on the existing diff parser in fileops, 
    // but here we need to map it back to CodePatch objects.
    
    // Simple heuristic to split diffs if multiple files are in one block
    // A unified diff usually starts with "--- " or "diff --git"
    // However, for this pipeline, we will try to extract them based on our known filesToEdit
    
    // In a real robust system, we would parse the diff string completely.
    // Here, we just return one "patch" object containing the whole diff block
    // and let applyPatchToDisk parse it.
    
    // We attach it to the first file just for object structure, 
    // but the diff content might contain multiple files.
    if (plan.filesToEdit.length > 0) {
      patches.push({
        filePath: "multi-file-patch", // The diff content itself contains the paths
        diff: rawOutput,
        ok: true
      });
    }

    return patches;

  } catch (error) {
    console.error("Coder Agent Failed:", error);
    // Fallback
    return [{
      filePath: "error.log",
      diff: "",
      ok: false
    }];
  }
}