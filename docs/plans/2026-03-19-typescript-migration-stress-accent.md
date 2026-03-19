# TypeScript 迁移 + 重音大写功能：需求与架构设计

> 日期：2026-03-19
> 状态：Draft
> 版本：GlideRead v1.2.5 → v2.0.0

## 1. 背景

GlideRead 当前是纯 JavaScript Chrome 扩展（~1,200 行，8 个文件，零构建工具、零外部依赖）。
计划新增**重音大写（Stress Capitalization）** 功能——将英语/西语单词的重读音节字母转为大写，
辅助非母语读者感知单词发音节奏。该功能需要引入 CMU 发音词典数据（npm 包），
因此必须加入构建工具链，顺势迁移 TypeScript 以获得类型安全。

## 2. 需求

### 2.1 功能需求：重音大写（Stress Capitalization）

**核心能力**

| 语言 | 输入 | 输出 | 数据来源 |
|------|------|------|----------|
| 英语 | `computer` | `comPUter` | CMU Pronouncing Dictionary 查表 |
| 英语 | `beautiful` | `BEAUtiful` | CMU Pronouncing Dictionary 查表 |
| 西语 | `español` | `espAÑol` | 拼写规则算法（确定性） |
| 西语 | `corazón` | `coraZÓN` | 拼写规则算法（有 accent mark 直接定位） |

**详细规则**

- 英语：使用 CMU Pronouncing Dictionary（ARPAbet 音标体系），元音音素标记 `1` 为主重音、`2` 为次重音、`0` 为非重音。提取主重音（`1`）所在音节，将对应的原始字母大写。
- 西语：
  1. 有 written accent（á/é/í/ó/ú）→ 包含该字母的音节为重读音节
  2. 无 accent，词尾为元音/n/s → 倒数第二音节重读（palabra llana）
  3. 无 accent，词尾为其他辅音 → 最后一个音节重读（palabra aguda）
- CJK 字符不处理（与现有 bionic reading 一致）
- 未收录词（英语）保持原样不做转换

**用户交互**

- 新增阅读模式：`stress`（重音大写），与现有的 `glideread`、`bionic`、`enlarge` 并列
- 在 Options 页面的 Reading Mode 选择器中加入该选项
- Popup 中显示当前模式名称

### 2.2 技术需求：TypeScript 迁移

**目标**

- 所有 `.js` 源文件迁移为 `.ts`
- 引入构建工具链，输出到 `dist/` 目录
- Chrome 加载 `dist/` 而非项目根目录
- 开发体验：`npm run dev`（watch 模式）、`npm run build`（生产构建）

**约束**

- 保持 Manifest V3 兼容
- 扩展功能与现有版本完全一致（向后兼容）
- 构建产物体积尽量小

## 3. 架构设计

### 3.1 当前架构

```
Chrome 直接加载项目根目录
├── background.js          (service worker)
├── content.js             (动态注入)
├── utils/sites.js         (动态注入)
├── utils/dom.js           (动态注入)
├── utils/bionic.js        (动态注入)
├── utils/i18n.js          (options/popup 引用)
├── popup/popup.js
└── options/options.js
```

脚本注入方式：`background.js` 通过 `chrome.scripting.executeScript` 按顺序注入
`sites.js` → `dom.js` → `bionic.js` → `content.js`，各文件通过全局函数通信。

### 3.2 目标架构

```
项目根目录
├── src/
│   ├── background.ts          → dist/background.js
│   ├── content.ts             → dist/content.js    (bundle: sites + dom + bionic + stress)
│   ├── popup/
│   │   └── popup.ts           → dist/popup/popup.js
│   ├── options/
│   │   └── options.ts         → dist/options/options.js
│   ├── utils/
│   │   ├── sites.ts
│   │   ├── dom.ts
│   │   ├── bionic.ts
│   │   ├── i18n.ts
│   │   └── stress.ts          ★ 新增：重音检测模块
│   ├── data/
│   │   └── cmu-stress-map.json ★ 精简版 CMU 词典（word → stress index）
│   └── types/
│       └── settings.ts        ★ 共享类型定义
├── dist/                      ← Chrome 加载此目录
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── content.css
│   ├── popup/
│   ├── options/
│   ├── _locales/
│   └── icons/
├── scripts/
│   └── build-cmu-map.ts       ★ 构建脚本：从 CMU 词典提取精简 stress map
├── tsconfig.json
├── package.json
└── esbuild.config.ts
```

**关键变化**

1. **Content script 合并打包**：不再逐个注入 4 个文件，由 esbuild 将 `content.ts`
   及其依赖（sites/dom/bionic/stress）打包为单个 `dist/content.js`。
   `background.ts` 只需注入一个文件，简化注入逻辑。
2. **静态资源复制**：`manifest.json`、`_locales/`、`icons/`、HTML、CSS 在构建时
   复制到 `dist/`。
3. **全局函数 → ES Module import**：原来通过全局函数通信的模块改为标准 import/export。

### 3.3 构建工具链

| 工具 | 用途 | 选择理由 |
|------|------|----------|
| **esbuild** | Bundler + TS 编译 | 极快（<100ms 构建），配置简单，适合扩展 |
| **TypeScript** | 类型检查 (`tsc --noEmit`) | esbuild 只做转译不做类型检查，需要 tsc 补充 |
| **@anthropic-ai/sdk** → **@types/chrome** | Chrome API 类型定义 | 编辑器补全 + 编译时检查 |
| **cmu-pronouncing-dictionary** | CMU 数据源 | 构建时读取，提取精简 map |

```json
// package.json (核心部分)
{
  "scripts": {
    "dev": "node esbuild.config.ts --watch",
    "build": "tsc --noEmit && node esbuild.config.ts",
    "build:cmu": "ts-node scripts/build-cmu-map.ts",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "esbuild": "^0.25.x",
    "typescript": "^5.x",
    "@anthropic-ai/sdk": "...",
    "@types/chrome": "^0.0.x",
    "cmu-pronouncing-dictionary": "^x.x.x"
  }
}
```

### 3.4 CMU 词典数据策略

完整 CMU 词典约 134K 词条，~5MB。对浏览器扩展过大。采用以下优化策略：

**构建时处理**（`scripts/build-cmu-map.ts`）：

1. 读取 `cmu-pronouncing-dictionary` npm 包的完整数据
2. 解析每个词的 ARPAbet 音标，定位主重音（`1`）所在音节
3. 将音节边界映射回原始字母位置，生成 `[startIndex, endIndex]`
4. 输出精简 JSON：`{ "computer": [3, 5], "beautiful": [0, 4], ... }`
5. 可选：只保留最常用 30K 词（覆盖 95%+ 日常文本），进一步缩减体积

**预估体积**：

| 方案 | 词条数 | 原始大小 | gzip |
|------|--------|---------|------|
| 全量精简 | 134K | ~1.5 MB | ~500 KB |
| Top 30K 高频词 | 30K | ~400 KB | ~150 KB |

精简后的 JSON 在构建时内联到 `content.js` bundle 中。

### 3.5 新增模块设计：`src/utils/stress.ts`

```typescript
// --- 类型定义 ---

interface StressResult {
  /** 原始单词 */
  word: string;
  /** 重音大写后的结果，如 "comPUter" */
  stressed: string;
  /** 是否命中词典/规则 */
  found: boolean;
}

// --- 英语重音 ---

/** 构建时生成的精简 CMU 数据，内联为 JSON */
import cmuStressMap from '../data/cmu-stress-map.json';

/**
 * 英语单词重音大写。
 * 查 CMU stress map，将重读音节的字母转为大写。
 * 未收录词返回原样。
 */
export function stressifyEnglish(word: string): StressResult;

// --- 西语重音 ---

/**
 * 西语音节切分。
 * 处理二合元音（diphthong）、三合元音（triphthong）、
 * 元音分离（hiatus）等规则。
 */
function syllabifySpanish(word: string): string[];

/**
 * 西语重音定位（规则算法）。
 * 返回重读音节的索引。
 */
function findSpanishStress(syllables: string[]): number;

/**
 * 西语单词重音大写。
 */
export function stressifySpanish(word: string): StressResult;

// --- 统一入口 ---

/**
 * 自动检测语言并应用重音大写。
 * 检测逻辑：含 ñ/¿/¡ 或 accent mark 的词视为西语，
 * 其余尝试英语词典查询。
 */
export function stressify(word: string): StressResult;
```

### 3.6 与现有 bionic reading 流程的集成

当前 `content.ts` 的处理流程：

```
processElement(el)
  → getTextNodes(el)
  → for each textNode:
      → bionicify(text, intensity, mode)   // 返回 HTML string
      → 替换 DOM 节点
```

新增 `stress` 模式后：

```
processElement(el)
  → getTextNodes(el)
  → for each textNode:
      if mode === 'stress':
        → stressifyText(text)              // 新函数：对整段文本逐词做重音大写
        → 替换 DOM 节点（纯文本替换，不需要 <span> 包裹）
      else:
        → bionicify(text, intensity, mode) // 现有逻辑不变
```

`stress` 模式的渲染比 bionic/glideread 更简单——只需要替换字母大小写，
不需要额外的 `<span>` 和 CSS 样式。

### 3.7 类型定义：`src/types/settings.ts`

```typescript
export type ReadingMode = 'glideread' | 'bionic' | 'enlarge' | 'stress';
export type BionicIntensity = 'light' | 'medium' | 'heavy';
export type Theme = 'system' | 'light' | 'dark';

export interface GlideReadSettings {
  enabled: boolean;
  fontScale: number;        // 1.0 - 1.5
  lineHeightScale: number;  // 1.0 - 2.0
  readingMode: ReadingMode;
  bionicIntensity: BionicIntensity;
  theme: Theme;
  locale: string;
  presetSites: string[];
  customSites: string[];
}
```

### 3.8 manifest.json 变更

```diff
 {
   "manifest_version": 3,
-  "version": "1.2.5",
+  "version": "2.0.0",
   "background": {
     "service_worker": "background.js"
   }
   // 其余不变——构建工具将 manifest.json 复制到 dist/
 }
```

注入逻辑简化（`background.ts`）：

```diff
- // 当前：逐个注入 4 个文件
- await chrome.scripting.executeScript({
-   target: { tabId },
-   files: ['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js']
- });
+ // 迁移后：esbuild 已将所有依赖打包为单文件
+ await chrome.scripting.executeScript({
+   target: { tabId },
+   files: ['content.js']
+ });
```

## 4. 迁移步骤

### Phase 1：工具链搭建
1. `npm init` + 安装 devDependencies（esbuild, typescript, @types/chrome）
2. 配置 `tsconfig.json`（strict mode, ES2020 target）
3. 配置 `esbuild.config.ts`（多入口：background, content, popup, options）
4. 静态资源复制脚本（manifest, _locales, icons, HTML, CSS）
5. 验证：`npm run build` → `dist/` 输出 → Chrome 加载 `dist/` 功能正常

### Phase 2：JS → TS 迁移
1. 重命名 `.js` → `.ts`，修复编译错误
2. 全局函数通信 → ES Module import/export
3. 添加 `Settings` 等核心类型定义
4. `tsc --noEmit` 零错误

### Phase 3：重音大写功能
1. `scripts/build-cmu-map.ts`：构建精简词典
2. `src/utils/stress.ts`：英语查表 + 西语规则算法
3. `content.ts` 集成 `stress` 模式
4. Options/Popup UI 添加 `stress` 选项
5. i18n：四种语言（en/zh_CN/ja/ko）添加相关翻译

### Phase 4：优化与测试
1. 词典体积优化（高频词子集 vs 全量）
2. 构建产物体积检查
3. 手动测试：preset sites + 自定义站点
4. 可选：添加 vitest 单元测试（stress 模块优先）

## 5. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| CMU 音标到字母位置的映射不准确 | 重读音节标错 | 音节边界映射算法需要仔细测试，fallback 为不处理 |
| 词典体积过大影响扩展安装体验 | 用户流失 | 高频词子集 + gzip；或 IndexedDB 延迟加载 |
| esbuild 对 Chrome 扩展的兼容性 | 构建产物运行异常 | esbuild 在扩展场景已有大量实践，风险低 |
| 西语音节切分边界情况多 | 部分词处理不正确 | 优先使用 `silabea` npm 包，或参考其算法自实现 |
| TS 迁移引入回归 bug | 现有功能异常 | Phase 2 结束后做完整回归测试再进 Phase 3 |
