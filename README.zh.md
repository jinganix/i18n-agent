[![CI](https://github.com/jinganix/i18n-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/jinganix/i18n-agent/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/jinganix/i18n-agent/badge.svg?branch=master)](https://coveralls.io/github/jinganix/i18n-agent?branch=master)
[![License](http://img.shields.io/:license-apache-brightgreen.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)

[English Version](README.md)

# i18n-agent

基于 AI 的国际化（i18n）翻译同步工具，使用自然语言命令管理多语言翻译文件。

## ✨ 特性

- 🤖 **AI 助手**：使用自然语言命令执行翻译任务
- 🔄 **智能同步**：支持 diff 和 full 两种同步模式
- 🌍 **BCP 47 标准**：完全遵循 BCP 47 语言标签标准
- 📁 **灵活配置**：支持 JSON 配置文件驱动
- 🔍 **增量翻译**：diff 模式只翻译新增或修改的键
- ✅ **自动验证**：翻译完成后自动验证 JSON 格式
- 🎯 **批量处理**：根据 token 限制智能分批翻译
- 🛠️ **类型安全**：完整的 TypeScript 类型支持
- 🧪 **测试完备**：100% 测试覆盖率

## 🚀 快速开始

### 安装

```bash
npm install -g i18n-agent
```

### 创建配置文件

在项目根目录创建 `i18n-agent.config.json`：

```json
{
  "sourceLocale": "en-US",
  "targetLocales": ["zh-CN", "zh-TW", "ja-JP"],
  "localesDir": "./locales",
  "tokenSize": 3000,
  "mode": "diff",
  "api": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "your-api-key",
    "model": "gpt-4o-mini",
    "timeout": 30000
  }
}
```

### 基本用法

#### 1. 使用 AI 助手（推荐）

```bash
# 翻译指定文件到简体中文
i18n-agent ask "将 en-US.json 翻译成简体中文"

# 翻译所有文件到简体中文和繁体中文
i18n-agent ask "将/foo目录里所有文件翻译成简体中文和繁体中文"

# 指定配置文件
i18n-agent ask "翻译 foo.json 到简体中文" -c ./config.json
```

#### 2. 直接同步命令

```bash
# 同步所有文件（使用配置文件中的 targetLocales）
i18n-agent sync -c i18n-agent.config.json

# 同步指定文件到特定语言
i18n-agent sync -c i18n-agent.config.json -s en-US.json --target-locales zh-CN,zh-TW

# 使用 full 模式（重新翻译所有键）
i18n-agent sync -c i18n-agent.config.json --mode full

# 预览模式（不调用 API）
i18n-agent sync -c i18n-agent.config.json --dry-run
```

## 📋 配置说明

### 配置文件字段

| 字段              | 类型       | 必填 | 说明                            |
|-----------------|----------|----|-------------------------------|
| `sourceLocale`  | string   | 是  | 源语言，必须使用 BCP 47 格式（如 en-US）   |
| `targetLocales` | string[] | 是  | 目标语言列表，使用 BCP 47 格式           |
| `localesDir`    | string   | 是  | 翻译文件所在目录                      |
| `tokenSize`     | number   | 否  | 每批翻译的最大 token 数（默认 3000）      |
| `mode`          | string   | 否  | 同步模式：`diff` 或 `full`（默认 diff） |
| `api.baseUrl`   | string   | 是  | AI API 基础 URL                 |
| `api.apiKey`    | string   | 是  | API 密钥                        |
| `api.model`     | string   | 否  | 使用的模型（默认 gpt-4o-mini）         |
| `api.timeout`   | number   | 否  | API 超时时间（毫秒，默认 30000）         |

### 同步模式

- **diff 模式**（默认）：只翻译新增或修改的键，保留现有翻译
- **full 模式**：重新翻译所有键，覆盖现有翻译

### BCP 47 语言代码示例

- 简体中文：`zh-CN`
- 繁体中文：`zh-TW`
- 日语：`ja-JP`
- 美式英语：`en-US`
- 英式英语：`en-GB`
- 法语：`fr-FR`
- 德语：`de-DE`
- 西班牙语：`es-ES`
- 俄语：`ru-RU`
- 阿拉伯语：`ar-SA`

## 📂 目录结构

```
project/
├── i18n-agent.config.json    # 配置文件
└── locales/                   # 翻译文件目录
    ├── en-US/                 # 源语言目录
    │   ├── en-US.json
    │   └── messages.json
    ├── zh-CN/                 # 目标语言目录（简体中文）
    │   ├── zh-CN.json
    │   └── messages.json
    └── zh-TW/                 # 目标语言目录（繁体中文）
        ├── zh-TW.json
        └── messages.json
```

### 文件名规则

- 如果文件名包含源语言代码（如 `en-US.json`），会自动转换为对应目标语言（如 `zh-CN.json`）
- 其他文件名保持不变（如 `messages.json` → `messages.json`）

## 🛠️ 开发

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 常用命令

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run coverage

# 代码检查
npm run lint

# 自动修复代码格式
npm run lint:fix

# 构建项目
npm run build

# 运行 CLI（开发模式）
npm run cli -- sync -c ./tests/fixture/i18n-agent.config.json

# 完整检查（lint + 测试覆盖率）
npm run check
```

### 测试覆盖率

项目保持 100% 测试覆盖率：

```bash
npm run check
```

## 🏗️ 架构

i18n-agent 基于 LangGraph 构建，采用状态图工作流：

1. **loadConfig**：加载配置文件
2. **scanFiles**：扫描源语言文件
3. **flattenKeys**：扁平化嵌套 JSON 结构
4. **buildTasks**：构建翻译任务批次
5. **translate**：调用 AI API 进行翻译
6. **validateResults**：验证翻译结果
7. **syncFiles**：同步翻译到目标文件

## 📝 Prompt 模板

项目支持针对不同语言的定制化 prompt 模板：

- `translate.default.md`：默认翻译 prompt
- `translate.zh.md`：中文翻译专用 prompt（简体/繁体）
- `translate.ja.md`：日语翻译专用 prompt（示例）

可以在 `src/prompts/` 目录下自定义或添加新的语言 prompt。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 提交规范

使用 Commitizen 进行规范化提交：

```bash
npm run cz
```

支持的 scope：

- `deps`：依赖更新
- `docs`：文档更新

## 📄 许可证

Apache License 2.0

## 🔗 相关链接

- [GitHub Repository](https://github.com/jinganix/i18n-agent)
- [Issue Tracker](https://github.com/jinganix/i18n-agent/issues)
