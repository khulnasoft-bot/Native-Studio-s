// Simulating a file system in browser memory
import { VirtualFile } from '../types';

class MockFileSystem {
  private files: Map<string, string>;

  constructor() {
    this.files = new Map();
    // Initialize with some dummy files matching the prompt examples
    this.files.set('src/index.ts', `console.log("Starting application...");
// Initial main file
function main() {
  console.log("App running");
}
main();`);
    
    this.files.set('src/handlers/api.ts', `export const getUser = (id: string) => {
  // Database lookup simulation
  return { id, name: "John Doe" };
};

export const createUser = (data: any) => {
  console.log("Creating user", data);
  return { success: true };
};`);

    this.files.set('package.json', `{
  "name": "ai-native-ts",
  "version": "0.1.0"
}`);
  }

  async readFile(path: string): Promise<string> {
    // Simulate async IO
    await new Promise(resolve => setTimeout(resolve, 50)); 
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.files.get(path) || '';
  }

  async writeFile(path: string, content: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  getAllFiles(): VirtualFile[] {
    return Array.from(this.files.entries()).map(([path, content]) => ({
      path,
      content
    })).sort((a, b) => a.path.localeCompare(b.path));
  }

  reset() {
    // Reset capability if needed, currently persistent in memory instance
  }
}

export const vfs = new MockFileSystem();