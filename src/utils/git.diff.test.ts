import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compareKeys,
  detectAllChanges,
  detectGitChanges,
  detectMissingKeysInTarget,
  extractKeysFromJson,
  hasGitChanges,
  isGitTracked,
} from "./git.diff.js";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("utils/git.diff", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("extractKeysFromJson", () => {
    it("should extract keys from valid JSON", () => {
      const json = '{"key1": "value1", "key2": "value2"}';
      const keys = extractKeysFromJson(json);

      expect(keys).toEqual(new Set(["key1", "key2"]));
    });

    it("should return empty set for invalid JSON", () => {
      const keys = extractKeysFromJson("invalid json");

      expect(keys).toEqual(new Set());
    });

    it("should handle empty object", () => {
      const keys = extractKeysFromJson("{}");

      expect(keys).toEqual(new Set());
    });
  });

  describe("compareKeys", () => {
    it("should detect added keys", () => {
      const oldKeys = new Set(["key1"]);
      const newKeys = new Set(["key1", "key2", "key3"]);

      const result = compareKeys(oldKeys, newKeys);

      expect(result.added).toEqual(["key2", "key3"]);
      expect(result.deleted).toEqual([]);
    });

    it("should detect deleted keys", () => {
      const oldKeys = new Set(["key1", "key2", "key3"]);
      const newKeys = new Set(["key1"]);

      const result = compareKeys(oldKeys, newKeys);

      expect(result.added).toEqual([]);
      expect(result.deleted).toEqual(["key2", "key3"]);
    });

    it("should handle both added and deleted keys", () => {
      const oldKeys = new Set(["key1", "key2"]);
      const newKeys = new Set(["key2", "key3"]);

      const result = compareKeys(oldKeys, newKeys);

      expect(result.added).toEqual(["key3"]);
      expect(result.deleted).toEqual(["key1"]);
    });

    it("should handle identical key sets", () => {
      const oldKeys = new Set(["key1", "key2"]);
      const newKeys = new Set(["key1", "key2"]);

      const result = compareKeys(oldKeys, newKeys);

      expect(result.added).toEqual([]);
      expect(result.deleted).toEqual([]);
    });
  });

  describe("isGitTracked", () => {
    it("should return true for git tracked file", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockReturnValue("path/to/file.json\n");

      const result = isGitTracked("path/to/file.json");

      expect(result).toBe(true);
    });

    it("should return false for non-tracked file", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not tracked");
      });

      const result = isGitTracked("path/to/file.json");

      expect(result).toBe(false);
    });
  });

  describe("hasGitChanges", () => {
    it("should return true when file has changes", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockReturnValue(" M path/to/file.json\n");

      const result = hasGitChanges("path/to/file.json");

      expect(result).toBe(true);
    });

    it("should return false when file has no changes", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockReturnValue("");

      const result = hasGitChanges("path/to/file.json");

      expect(result).toBe(false);
    });

    it("should return false when git command fails", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("git error");
      });

      const result = hasGitChanges("path/to/file.json");

      expect(result).toBe(false);
    });
  });

  describe("detectGitChanges", () => {
    it("should throw error if file does not exist", async () => {
      const { existsSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(false);

      expect(() => detectGitChanges("nonexistent.json")).toThrow("File not found");
    });

    it("should return null for non-git files", async () => {
      const { existsSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);

      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not tracked");
      });

      const result = detectGitChanges("file.json");

      expect(result).toBeNull();
    });

    it("should return empty changes when getGitPreviousVersion throws", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"key1": "value1"}');

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("file.json\n") // isGitTracked
        .mockReturnValueOnce("") // no git changes
        .mockReturnValueOnce("abc123\n") // commit hash succeeds
        .mockImplementation(() => {
          throw new Error("git show error");
        }); // git show will throw, caught in getGitPreviousVersion

      const result = detectGitChanges("file.json");

      expect(result).toBeDefined();
      expect(result!.changes.added).toEqual([]);
      expect(result!.changes.deleted).toEqual([]);
    });

    it("should detect changes when file has uncommitted changes", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "new value", "key2": "value2"}') // current content
        .mockReturnValueOnce('{"key1": "old value"}'); // previous content

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("file.json\n") // isGitTracked
        .mockReturnValueOnce(" M file.json\n") // hasGitChanges
        .mockReturnValueOnce("abc123\n") // get commit hash
        .mockReturnValueOnce('{"key1": "old value"}'); // previous version

      const result = detectGitChanges("file.json");

      expect(result).toBeDefined();
      expect(result!.changes.added).toContain("key2");
      expect(result!.changes.deleted).toEqual([]);
    });

    it("should handle new file with no previous commits", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"key1": "value1", "key2": "value2"}');

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("file.json\n") // isGitTracked
        .mockReturnValueOnce(" M file.json\n") // hasGitChanges
        .mockReturnValueOnce(""); // no commit hash (new file)

      const result = detectGitChanges("file.json");

      expect(result).toBeDefined();
      expect(result!.changes.added.length).toBe(2);
      expect(result!.changes.added).toContain("key1");
      expect(result!.changes.added).toContain("key2");
      expect(result!.changes.deleted).toEqual([]);
    });

    it("should detect changes when file has no uncommitted changes", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "value1", "key2": "value2"}') // current content
        .mockReturnValueOnce('{"key1": "value1"}'); // previous content

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("file.json\n") // isGitTracked
        .mockReturnValueOnce("") // no git changes
        .mockReturnValueOnce("abc123\n") // get commit hash
        .mockReturnValueOnce('{"key1": "value1"}'); // previous version

      const result = detectGitChanges("file.json");

      expect(result).toBeDefined();
      expect(result!.changes.added).toContain("key2");
      expect(result!.changes.deleted).toEqual([]);
    });

    it("should return empty changes when only one version exists", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"key1": "value1"}');

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("file.json\n") // isGitTracked
        .mockReturnValueOnce("") // no git changes
        .mockReturnValueOnce(""); // no commit hash

      const result = detectGitChanges("file.json");

      expect(result).toBeDefined();
      expect(result!.changes.added).toEqual([]);
      expect(result!.changes.deleted).toEqual([]);
    });
  });

  describe("detectMissingKeysInTarget", () => {
    it("should detect missing keys in target", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "v1", "key2": "v2", "key3": "v3"}') // source
        .mockReturnValueOnce('{"key1": "v1"}'); // target

      const result = detectMissingKeysInTarget("source.json", "target.json");

      expect(result.missingKeys.sort()).toEqual(["key2", "key3"].sort());
      expect(result.sourceFile).toBe("source");
      expect(result.targetFile).toBe("target");
    });

    it("should return empty array when all keys exist in target", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "v1"}') // source
        .mockReturnValueOnce('{"key1": "v1", "key2": "v2"}'); // target

      const result = detectMissingKeysInTarget("source.json", "target.json");

      expect(result.missingKeys).toEqual([]);
    });

    it("should throw error if source file does not exist", async () => {
      const { existsSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValueOnce(false);

      expect(() => detectMissingKeysInTarget("source.json", "target.json")).toThrow(
        "Source file not found",
      );
    });

    it("should throw error if target file does not exist", async () => {
      const { existsSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValueOnce(true).mockReturnValueOnce(false);

      expect(() => detectMissingKeysInTarget("source.json", "target.json")).toThrow(
        "Target file not found",
      );
    });
  });

  describe("detectAllChanges", () => {
    it("should detect both git changes and target missing keys", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);

      // Mock readFileSync calls in order:
      // 1. detectGitChanges reads current content
      // 2. detectMissingKeysInTarget reads source content
      // 3. detectMissingKeysInTarget reads target content
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "v1", "key2": "v2"}') // source current (in detectGitChanges)
        .mockReturnValueOnce('{"key1": "v1", "key2": "v2"}') // source (in detectMissingKeysInTarget)
        .mockReturnValueOnce('{"key1": "v1"}'); // target (in detectMissingKeysInTarget)

      const { execSync } = await import("child_process");
      vi.mocked(execSync)
        .mockReturnValueOnce("source.json\n") // isGitTracked
        .mockReturnValueOnce(" M source.json\n") // hasGitChanges
        .mockReturnValueOnce("abc123\n") // commit hash
        .mockReturnValueOnce('{"key1": "v1"}'); // previous version

      const result = detectAllChanges("source.json", "target.json");

      expect(result.gitChanges).toBeDefined();
      expect(result.summary.totalAdded).toBe(1);
      expect(result.targetMissingKeys).toBeDefined();
      expect(result.summary.totalMissingInTarget).toBe(1);
    });

    it("should handle case without target file", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"key1": "v1"}');

      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not tracked");
      });

      const result = detectAllChanges("source.json");

      expect(result.gitChanges).toBeUndefined();
      expect(result.targetMissingKeys).toBeUndefined();
    });

    it("should not set targetMissingKeys when all keys exist in target", async () => {
      const { existsSync, readFileSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync)
        .mockReturnValueOnce('{"key1": "v1"}') // source current (in detectGitChanges)
        .mockReturnValueOnce('{"key1": "v1"}') // source (in detectMissingKeysInTarget)
        .mockReturnValueOnce('{"key1": "v1", "key2": "v2"}'); // target (has all keys)

      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not tracked");
      });

      const result = detectAllChanges("source.json", "target.json");

      expect(result.gitChanges).toBeUndefined();
      expect(result.targetMissingKeys).toBeUndefined();
      expect(result.summary.totalMissingInTarget).toBe(0);
    });
  });
});
