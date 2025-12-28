import fs from 'fs/promises';
import path from 'path';

export const atomicWriteFile = async (filePath: string, content: string) => {
  const tempFile = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
  try {
    // Write to temp file first
    await fs.writeFile(tempFile, content, 'utf-8');
    // Atomic rename
    await fs.rename(tempFile, filePath);
  } catch (error) {
    // Clean up temp file if something goes wrong
    try {
      await fs.unlink(tempFile);
    } catch (e) {
      // Ignore unlink error
    }
    throw error;
  }
};
