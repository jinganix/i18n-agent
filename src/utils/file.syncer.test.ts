import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { restoreNestedStructure, syncTranslationToFile } from "./file.syncer.js";

describe("file.syncer", () => {
  it("should restore nested structure from flattened keys", () => {
    const flattened = {
      "user.age": 30,
      "user.name": "John",
      "user.profile.email": "john@example.com",
    };

    const result = restoreNestedStructure(flattened);

    expect(result).toEqual({
      user: {
        age: 30,
        name: "John",
        profile: {
          email: "john@example.com",
        },
      },
    });
  });

  it("should handle single level keys", () => {
    const flattened = {
      key1: "value1",
      key2: "value2",
    };

    const result = restoreNestedStructure(flattened);

    expect(result).toEqual({
      key1: "value1",
      key2: "value2",
    });
  });

  it("should sync translation to file", () => {
    const testDir = "/tmp/test-sync";
    const testFile = join(testDir, "test.json");

    const translatedData = {
      "1.user.age": "年龄",
      "1.user.name": "用户名称",
    };

    const result = syncTranslationToFile(testFile, translatedData);

    expect(result.filePath).toBe(testFile);
    expect(result.keyCount).toBe(2);

    const content = readFileSync(testFile, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed["1"]).toBeDefined();
    expect(parsed["1"].user).toBeDefined();
    expect(parsed["1"].user.name).toBe("用户名称");

    rmSync(testDir, { force: true, recursive: true });
  });
});
