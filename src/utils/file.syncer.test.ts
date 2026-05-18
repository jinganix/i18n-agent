import { readFileSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  restoreNestedStructure,
  syncTranslationToFile,
  mergeWithExistingData,
} from "./file.syncer.js";

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

  it("should merge with existing data when target file exists", () => {
    const testDir = "/tmp/test-merge";
    const testFile = join(testDir, "test.json");

    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      testFile,
      JSON.stringify({
        key1: "existing value 1",
        key2: "existing value 2",
        nested: {
          key3: "existing value 3",
        },
      }),
      "utf-8",
    );

    const newData = {
      key2: "new value 2",
      key4: "new value 4",
    };

    const result = mergeWithExistingData(testFile, newData);

    expect(result.key1).toBe("existing value 1");
    expect(result.key2).toBe("new value 2");
    expect(result.key4).toBe("new value 4");
    expect(result["nested.key3"]).toBe("existing value 3");

    rmSync(testDir, { force: true, recursive: true });
  });

  it("should return new data when target file does not exist", () => {
    const newData = {
      key1: "value 1",
      key2: "value 2",
    };

    const result = mergeWithExistingData("/nonexistent/path.json", newData);

    expect(result).toEqual(newData);
  });

  it("should return new data when target file has invalid JSON", () => {
    const testDir = "/tmp/test-merge-invalid";
    const testFile = join(testDir, "test.json");

    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, "invalid json", "utf-8");

    const newData = {
      key1: "value 1",
    };

    const result = mergeWithExistingData(testFile, newData);

    expect(result).toEqual(newData);

    rmSync(testDir, { force: true, recursive: true });
  });
});
