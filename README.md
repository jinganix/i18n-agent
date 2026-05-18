[![CI](https://github.com/jinganix/i18n-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/jinganix/i18n-agent/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/jinganix/i18n-agent/badge.svg?branch=master)](https://coveralls.io/github/jinganix/i18n-agent?branch=master)
[![License](http://img.shields.io/:license-apache-brightgreen.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)

[中文版本](README.zh.md)

# i18n-agent

AI-powered internationalization (i18n) translation synchronization tool that manages multilingual
translation files using natural language commands.

## ✨ Features

- 🤖 **AI Assistant**: Execute translation tasks using natural language commands
- 🔄 **Smart Sync**: Supports both diff and full synchronization modes
- 🌍 **BCP 47 Standard**: Fully compliant with BCP 47 language tag standard
- 📁 **Flexible Configuration**: JSON configuration file driven
- 🔍 **Incremental Translation**: Diff mode only translates new or modified keys
- ✅ **Auto Validation**: Automatically validates JSON format after translation
- 🎯 **Batch Processing**: Intelligently batches translations based on token limits
- 🛠️ **Type Safe**: Complete TypeScript type support
- 🧪 **Well Tested**: 100% test coverage

## 🚀 Quick Start

### Option 1: Local Installation (Recommended)

Since the project is not yet published to npm, it's recommended to use it by cloning the repository:

```bash
# 1. Clone the repository
git clone https://github.com/jinganix/i18n-agent.git
cd i18n-agent

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create configuration file
# Create i18n-agent.config.json in the project root (see configuration section below)

# 5. Run commands
# Use the built CLI
./dist/cli/index.js ask "Translate en-US.json to Simplified Chinese" -c ./i18n-agent.config.json

# Or run in development mode (no build required)
npm run cli -- ask "Translate en-US.json to Simplified Chinese" -c ./i18n-agent.config.json
```

### Option 2: Global Installation (Coming Soon)

Once the project is published to npm, you can install it globally:

```bash
npm install -g i18n-agent
```

### Create Configuration File

Create `i18n-agent.config.json` in your project root:

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

### Basic Usage

#### 1. Using AI Assistant (Recommended)

```bash
# Translate specific file to Simplified Chinese
i18n-agent ask "Translate en-US.json to Simplified Chinese"

# Translate all files in /foo directory to Simplified and Traditional Chinese
i18n-agent ask "Translate all files in /foo directory to Simplified and Traditional Chinese"

# Specify configuration file
i18n-agent ask "Translate foo.json to Simplified Chinese" -c ./config.json
```

#### 2. Direct Sync Command

```bash
# Sync all files (using targetLocales from config)
i18n-agent sync -c i18n-agent.config.json

# Sync specific file to特定 languages
i18n-agent sync -c i18n-agent.config.json -s en-US.json --target-locales zh-CN,zh-TW

# Use full mode (re-translate all keys)
i18n-agent sync -c i18n-agent.config.json --mode full

# Preview mode (without calling API)
i18n-agent sync -c i18n-agent.config.json --dry-run
```

## 📋 Configuration

### Configuration Fields

| Field           | Type     | Required | Description                                           |
|-----------------|----------|----------|-------------------------------------------------------|
| `sourceLocale`  | string   | Yes      | Source language, must use BCP 47 format (e.g., en-US) |
| `targetLocales` | string[] | Yes      | Target language list, use BCP 47 format               |
| `localesDir`    | string   | Yes      | Directory containing translation files                |
| `tokenSize`     | number   | No       | Maximum tokens per batch (default: 3000)              |
| `mode`          | string   | No       | Sync mode: `diff` or `full` (default: diff)           |
| `api.baseUrl`   | string   | Yes      | AI API base URL                                       |
| `api.apiKey`    | string   | Yes      | API key                                               |
| `api.model`     | string   | No       | Model to use (default: gpt-4o-mini)                   |
| `api.timeout`   | number   | No       | API timeout in milliseconds (default: 30000)          |

### Sync Modes

- **diff mode** (default): Only translates new or modified keys, preserves existing translations
- **full mode**: Re-translates all keys, overwrites existing translations

### BCP 47 Language Code Examples

- Simplified Chinese: `zh-CN`
- Traditional Chinese: `zh-TW`
- Japanese: `ja-JP`
- American English: `en-US`
- British English: `en-GB`
- French: `fr-FR`
- German: `de-DE`
- Spanish: `es-ES`
- Russian: `ru-RU`
- Arabic: `ar-SA`

## 📂 Directory Structure

```
project/
├── i18n-agent.config.json    # Configuration file
└── locales/                   # Translation files directory
    ├── en-US/                 # Source language directory
    │   ├── en-US.json
    │   └── messages.json
    ├── zh-CN/                 # Target language directory (Simplified Chinese)
    │   ├── zh-CN.json
    │   └── messages.json
    └── zh-TW/                 # Target language directory (Traditional Chinese)
        ├── zh-TW.json
        └── messages.json
```

### Filename Rules

- If filename contains source locale code (e.g., `en-US.json`), it will be automatically converted
  to corresponding target locale (e.g., `zh-CN.json`)
- Other filenames remain unchanged (e.g., `messages.json` → `messages.json`)

## 🛠️ Development

### Requirements

- Node.js >= 18
- npm >= 9

### Install Dependencies

```bash
npm install
```

### Common Commands

```bash
# Run tests
npm test

# Run tests with coverage report
npm run coverage

# Lint code
npm run lint

# Auto-fix code formatting
npm run lint:fix

# Build project
npm run build

# Run CLI (development mode)
npm run cli -- sync -c ./tests/fixture/i18n-agent.config.json

# Full check (lint + test coverage)
npm run check
```

### Test Coverage

The project maintains 100% test coverage:

```bash
npm run check
```

## 🏗️ Architecture

i18n-agent is built on LangGraph using a state graph workflow:

1. **loadConfig**: Load configuration file
2. **scanFiles**: Scan source language files
3. **flattenKeys**: Flatten nested JSON structure
4. **buildTasks**: Build translation task batches
5. **translate**: Call AI API for translation
6. **validateResults**: Validate translation results
7. **syncFiles**: Sync translations to target files

## 📝 Prompt Templates

The project supports customized prompt templates for different languages:

- `translate.default.md`: Default translation prompt
- `translate.zh.md`: Chinese translation prompt (Simplified/Traditional)
- `translate.ja.md`: Japanese translation prompt (example)

You can customize or add new language prompts in the `src/prompts/` directory.

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Commit Convention

Use Commitizen for standardized commits:

```bash
npm run cz
```

Supported scopes:

- `deps`: Dependency updates
- `docs`: Documentation updates

## 📄 License

Apache License 2.0

## 🔗 Related Links

- [GitHub Repository](https://github.com/jinganix/i18n-agent)
- [Issue Tracker](https://github.com/jinganix/i18n-agent/issues)
