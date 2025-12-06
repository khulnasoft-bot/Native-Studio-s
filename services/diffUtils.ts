// A lightweight diff generator since we can't use 'diff' npm package in this environment easily
// This creates a simplified Unified Diff format

export function createUnifiedDiff(
  oldPath: string,
  newPath: string,
  oldContent: string,
  newContent: string
): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let output = `--- ${oldPath}\n+++ ${newPath}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
  
  // Very naive diff for demonstration:
  // It just shows the whole file as changed if there's any difference, 
  // or appends specific lines if strictly additive. 
  // For a real app, we'd use 'diff' package.
  
  // Optimization for the "Append" use case in the demo
  if (newContent.startsWith(oldContent) && newContent.length > oldContent.length) {
     // It's an append
     const addedContent = newContent.substring(oldContent.length);
     output += ' ' + oldLines.join('\n ') + '\n';
     const addedLines = addedContent.split('\n');
     // First line of added content might be on the same line as last of old, but let's assume newline for now
     addedLines.forEach(line => {
        if(line) output += '+' + line + '\n';
     });
     return output;
  }

  // Fallback: Dump old as removed, new as added (classic simple diff)
  oldLines.forEach(l => output += `-${l}\n`);
  newLines.forEach(l => output += `+${l}\n`);
  
  return output;
}