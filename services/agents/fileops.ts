import { FileContext } from '../../types';
import { vfs } from '../mockFileSystem';

export async function getContext(files: string[], maxLines = 300): Promise<FileContext[]> {
  const contexts: FileContext[] = [];
  
  for (const f of files) {
    // Check if file exists in VFS
    if (await vfs.exists(f)) {
        const raw = await vfs.readFile(f);
        const lines = raw.split("\n");
        const content = lines.length > maxLines ? lines.slice(-maxLines).join("\n") : raw;
        contexts.push({ path: f, content });
    }
  }
  return contexts;
}

export async function readFileOrEmpty(relPath: string): Promise<string> {
  try {
    return await vfs.readFile(relPath);
  } catch {
    return ""; // treat missing file as empty (new-file creation)
  }
}

interface Hunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
}

interface ParsedPatch {
    oldFileName: string;
    newFileName: string;
    hunks: Hunk[];
}

export async function applyPatchToDisk(unifiedDiff: string, dryRun = true): Promise<{ applied: boolean; message?: string }> {
  if (dryRun) {
    return { applied: false, message: "dry-run mode; no files changed" };
  }

  let patches: ParsedPatch[];
  try {
    patches = parseUnifiedDiff(unifiedDiff);
  } catch (error: any) {
    return { applied: false, message: `Diff Parsing Error: ${error.message}` };
  }
  
  if (patches.length === 0) {
      return { applied: false, message: "No valid patches found in diff." };
  }

  let successCount = 0;
  let errors: string[] = [];

  for (const patch of patches) {
      const targetFile = patch.newFileName;
      
      try {
          if (!targetFile) throw new Error("Target filename is missing in patch");

          let originalContent = "";
          // Check existence using try-catch on readFile if strictly following node fs, but we have vfs.exists
          const exists = await vfs.exists(targetFile);
          
          if (exists) {
              try {
                originalContent = await vfs.readFile(targetFile);
              } catch (readError: any) {
                throw new Error(`Unable to read existing file: ${readError.message}`);
              }
          }
          
          let newContent = "";
          try {
            newContent = applyPatch(originalContent, patch.hunks);
          } catch (patchError: any) {
            throw new Error(`Patching logic failed: ${patchError.message}`);
          }
          
          try {
            await vfs.writeFile(targetFile, newContent);
          } catch (writeError: any) {
            throw new Error(`File write failed: ${writeError.message}`);
          }
          
          successCount++;
      } catch (e: any) {
          console.error(`Failed to apply patch for ${targetFile || 'unknown file'}:`, e);
          errors.push(`${targetFile || 'unknown'}: ${e.message}`);
      }
  }

  if (errors.length > 0) {
      return { 
          applied: successCount > 0, 
          message: `Operation completed with errors. Applied: ${successCount}. Failed: ${errors.length}. Details: ${errors.join(' | ')}` 
      };
  }

  return { applied: true, message: `Successfully applied changes to ${successCount} file(s).` };
}

function parseUnifiedDiff(diff: string): ParsedPatch[] {
    const lines = diff.split('\n');
    const patches: ParsedPatch[] = [];
    let currentPatch: ParsedPatch | null = null;
    let currentHunk: Hunk | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('--- ')) {
            if (currentPatch) {
                if (currentHunk) currentPatch.hunks.push(currentHunk);
                patches.push(currentPatch);
                currentHunk = null;
            }
            
            currentPatch = {
                oldFileName: line.substring(4).trim(),
                newFileName: "", // Will be filled by +++
                hunks: []
            };
        } else if (line.startsWith('+++ ')) {
            if (currentPatch) {
                currentPatch.newFileName = line.substring(4).trim();
            }
        } else if (line.startsWith('@@ ')) {
            if (currentPatch) {
                if (currentHunk) currentPatch.hunks.push(currentHunk);
                
                // Parse header like @@ -1,5 +1,6 @@
                // Sometimes it is @@ -1 +1 @@ if lines are 1
                const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
                if (match) {
                    currentHunk = {
                        oldStart: parseInt(match[1]),
                        oldLines: match[2] ? parseInt(match[2]) : 1,
                        newStart: parseInt(match[3]),
                        newLines: match[4] ? parseInt(match[4]) : 1,
                        lines: []
                    };
                }
            }
        } else if (currentHunk) {
            // Check if line is a hunk content line
            if (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-')) {
                 currentHunk.lines.push(line);
            } else if (line === '') {
                 // Sometimes empty line in diff means empty context line in loose formats
                 currentHunk.lines.push(' ');
            }
        }
    }
    
    if (currentPatch) {
        if (currentHunk) currentPatch.hunks.push(currentHunk);
        patches.push(currentPatch);
    }
    
    return patches;
}

function applyPatch(original: string, hunks: Hunk[]): string {
    const lines = original.split('\n');
    let result: string[] = [];
    let originalIndex = 0;

    // Sort hunks by start index to ensure orderly application
    hunks.sort((a, b) => a.oldStart - b.oldStart);

    for (const hunk of hunks) {
        // Validation: Prevent going backwards or overlapping weirdly
        if (hunk.oldStart < originalIndex + 1) {
             // Depending on strictness, we might warn. For now, we assume hunks don't overlap.
        }

        // Copy lines before the hunk
        // hunk.oldStart is 1-based
        while (originalIndex < hunk.oldStart - 1 && originalIndex < lines.length) {
            result.push(lines[originalIndex]);
            originalIndex++;
        }

        for (const line of hunk.lines) {
            const type = line[0]; // ' ', '+', '-'
            const content = line.substring(1);
            
            if (type === ' ' || type === undefined) { 
                // Context
                if (originalIndex < lines.length) {
                    result.push(lines[originalIndex]); 
                    originalIndex++;
                }
            } else if (type === '-') {
                // Deletion
                originalIndex++;
            } else if (type === '+') {
                // Addition
                result.push(content);
            }
        }
    }

    // Append remaining lines
    while (originalIndex < lines.length) {
        result.push(lines[originalIndex]);
        originalIndex++;
    }

    return result.join('\n');
}