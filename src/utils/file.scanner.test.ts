import { describe, it, expect, vi } from "vitest";
import { collectJsonFiles, logFileList, type FileItem } from "./file.scanner.js";

vi.mock("fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

describe("file.scanner", () => {
  describe("collectJsonFiles", () => {
    it("should collect JSON files from directory", async () => {
      const { readdirSync, statSync } = await import("fs");

      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as ReturnType<typeof statSync>);

      vi.mocked(readdirSync).mockReturnValue(["file1.json", "file2.json"] as unknown as ReturnType<
        typeof readdirSync
      >);

      const files: FileItem[] = [];
      const nextId = collectJsonFiles("/test/dir", "/test/dir", files, 1);

      expect(files).toHaveLength(2);
      expect(files[0].id).toBe(1);
      expect(files[1].id).toBe(2);
      expect(nextId).toBe(3);
    });

    it("should skip non-JSON files", async () => {
      const { readdirSync, statSync } = await import("fs");

      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as ReturnType<typeof statSync>);

      vi.mocked(readdirSync).mockReturnValue([
        "file.json",
        "file.txt",
        "file.md",
      ] as unknown as ReturnType<typeof readdirSync>);

      const files: FileItem[] = [];
      collectJsonFiles("/test/dir", "/test/dir", files, 1);

      expect(files).toHaveLength(1);
      expect(files[0].relativePath).toBe("file.json");
    });

    it("should continue ID numbering from startId", async () => {
      const { readdirSync, statSync } = await import("fs");

      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as ReturnType<typeof statSync>);

      vi.mocked(readdirSync).mockReturnValue(["file.json"] as unknown as ReturnType<
        typeof readdirSync
      >);

      const files: FileItem[] = [];
      const nextId = collectJsonFiles("/test/dir", "/test/dir", files, 10);

      expect(files[0].id).toBe(10);
      expect(nextId).toBe(11);
    });
  });

  describe("logFileList", () => {
    it("should log file list to console", () => {
      const consoleSpy = vi.spyOn(console, "log");

      const files: FileItem[] = [
        { absolutePath: "/test/file1.json", id: 1, relativePath: "file1.json" },
        { absolutePath: "/test/file2.json", id: 2, relativePath: "file2.json" },
      ];

      logFileList(files);

      expect(consoleSpy).toHaveBeenCalledWith("Found 2 file(s) to process:");
      expect(consoleSpy).toHaveBeenCalledWith("  [1] file1.json");
      expect(consoleSpy).toHaveBeenCalledWith("  [2] file2.json");

      consoleSpy.mockRestore();
    });

    it("should handle empty file list", () => {
      const consoleSpy = vi.spyOn(console, "log");

      logFileList([]);

      expect(consoleSpy).toHaveBeenCalledWith("Found 0 file(s) to process:");

      consoleSpy.mockRestore();
    });
  });
});
