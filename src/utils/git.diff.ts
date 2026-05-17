import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { basename, extname } from "path";

export interface KeyChanges {
  added: string[];
  deleted: string[];
  modified: string[];
}

export interface FileKeyDiff {
  filePath: string;
  changes: KeyChanges;
}
export function isGitTracked(filePath: string): boolean {
  try {
    const result = execSync(`git ls-files "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

export function hasGitChanges(filePath: string): boolean {
  try {
    const result = execSync(`git status --porcelain "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

export function getGitPreviousVersion(filePath: string): string | null {
  try {
    const commitHash = execSync(`git log -1 --format=%H -- "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (!commitHash) {
      return null;
    }

    return execSync(`git show ${commitHash}^:"${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

export function extractKeysFromJson(content: string): Set<string> {
  try {
    const data = JSON.parse(content);
    const keys = Object.keys(data);
    return new Set(keys);
  } catch {
    return new Set();
  }
}

export function compareKeys(oldKeys: Set<string>, newKeys: Set<string>): KeyChanges {
  const added: string[] = [];
  const deleted: string[] = [];
  const modified: string[] = [];

  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      added.push(key);
    }
  }

  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      deleted.push(key);
    }
  }

  return { added, deleted, modified };
}

export function detectGitChanges(filePath: string): FileKeyDiff | null {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (!isGitTracked(filePath)) {
    return null;
  }

  const currentContent = readFileSync(filePath, "utf-8");
  const currentKeys = extractKeysFromJson(currentContent);

  let previousKeys: Set<string>;

  if (hasGitChanges(filePath)) {
    const previousContent = getGitPreviousVersion(filePath);
    if (!previousContent) {
      previousKeys = new Set();
    } else {
      previousKeys = extractKeysFromJson(previousContent);
    }
  } else {
    const previousContent = getGitPreviousVersion(filePath);
    if (!previousContent) {
      return {
        changes: { added: [], deleted: [], modified: [] },
        filePath,
      };
    }
    previousKeys = extractKeysFromJson(previousContent);
  }

  const changes = compareKeys(previousKeys, currentKeys);

  return {
    changes,
    filePath,
  };
}

export function detectMissingKeysInTarget(
  sourcePath: string,
  targetPath: string,
): { missingKeys: string[]; sourceFile: string; targetFile: string } {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  if (!existsSync(targetPath)) {
    throw new Error(`Target file not found: ${targetPath}`);
  }

  const sourceContent = readFileSync(sourcePath, "utf-8");
  const targetContent = readFileSync(targetPath, "utf-8");

  const sourceKeys = extractKeysFromJson(sourceContent);
  const targetKeys = extractKeysFromJson(targetContent);

  const missingKeys: string[] = [];

  for (const key of sourceKeys) {
    if (!targetKeys.has(key)) {
      missingKeys.push(key);
    }
  }

  return {
    missingKeys,
    sourceFile: basename(sourcePath, extname(sourcePath)),
    targetFile: basename(targetPath, extname(targetPath)),
  };
}

export interface DetectionResult {
  gitChanges?: FileKeyDiff;
  targetMissingKeys?: {
    missingKeys: string[];
    sourceFile: string;
    targetFile: string;
  };
  summary: {
    totalAdded: number;
    totalDeleted: number;
    totalMissingInTarget: number;
  };
}

export function detectAllChanges(sourcePath: string, targetPath?: string): DetectionResult {
  const result: DetectionResult = {
    summary: {
      totalAdded: 0,
      totalDeleted: 0,
      totalMissingInTarget: 0,
    },
  };

  const gitChanges = detectGitChanges(sourcePath);
  if (gitChanges) {
    result.gitChanges = gitChanges;
    result.summary.totalAdded = gitChanges.changes.added.length;
    result.summary.totalDeleted = gitChanges.changes.deleted.length;
  }

  if (targetPath) {
    const missingKeys = detectMissingKeysInTarget(sourcePath, targetPath);
    if (missingKeys.missingKeys.length > 0) {
      result.targetMissingKeys = missingKeys;
      result.summary.totalMissingInTarget = missingKeys.missingKeys.length;
    }
  }

  return result;
}
