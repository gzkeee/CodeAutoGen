# 🚀 前端代码生成工具 V7.1

将 JSON 配置文件编译为 **React + Ant Design** 源代码的 CLI 工具。

## 目录

- [快速开始](#快速开始)
- [配置文件格式](#配置文件格式)
- [组件类型](#组件类型)
- [数据流 (DataFlow)](#数据流-dataflow)
- [字段类型](#字段类型)
- [API 配置](#api-配置)
- [数据字典 (Select 动态选项)](#数据字典-select-动态选项)
- [请求层自定义](#请求层自定义)
- [容器嵌套](#容器嵌套)
- [Modal 弹窗](#modal-弹窗)
- [完整场景示例](#完整场景示例)
- [数据流行为参考](#数据流行为参考)
- [输出文件结构](#输出文件结构)
- [开发指南](#开发指南)

---

## 快速开始

```bash
# 安装依赖
npm install

# 用示例配置文件生成代码
node bin/generate.js \
  -c examples/test-scenario-01-crud.json \
  -o ./src/pages/UserManage \
  -n UserManage

# 或者使用 npm script
npm run example
```

### 命令行参数

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--config` | `-c` | JSON 配置文件路径 | **必填** |
| `--output` | `-o` | 代码输出目录 | **必填** |
| `--page-name` | `-n` | 页面组件名称 | `Page` |

```bash
# 生成完整页面
node bin/generate.js \
  -c ./my-page-config.json \
  -o ./src/pages/OrderManage \
  -n OrderManage
```

---

## 配置文件格式

配置文件是一个 JSON 文件，采用**多级树形结构**，顶层结构如下：

```json
{
  "comment": "可选：场景描述",
  "components": {
    "组件名1": { /* 组件定义 */ },
    "组件名2": { /* 组件定义 */ }
  },
  "DataFlow": {
    "links": [
      { "from": "组件名1", "to": "组件名2" },
      { "from": "组件名2", "to": "OUT" }
    ]
  }
}
```

| 字段 | 是否必填 | 说明 |
|------|----------|------|
| `components` | ✅ | 组件定义集合，key 为组件名，value 为组件配置 |
| `DataFlow` | ❌ | 数据流定义，描述组件间的数据传递关系 |
| `DataFlow.links` | ❌ | 数据流连接数组，每条指定 `from` → `to` |
| `comment` | ❌ | 注释说明，不影响生成 |

---

## 组件类型

### 1. Form（表单组件）

用于数据查询、新增、编辑等交互场景。

```json
{
  "SearchForm": {
    "Type": "Form",
    "Fields": [ /* 字段定义 */ ],
    "url": { "query": "/api/xxx" }
  }
}
```

### 2. Table（表格组件）

用于数据展示、行点击传递。

```json
{
  "UserTable": {
    "Type": "Table",
    "Fields": [ /* 字段定义 */ ],
    "url": { "load": "/api/xxx" }
  }
}
```

### 3. Modal（弹窗表单/表格）

弹窗模式，通过 `Layout: "Modal"` 开启：

```json
{
  "AddUserModal": {
    "Type": "Form",
    "Layout": "Modal",
    "Fields": [ /* 字段定义 */ ],
    "url": { "save": "/api/user/add" }
  }
}
```

Modal 有三种角色，由工具自动推导：

| Modal 角色 | 说明 | 判断逻辑 |
|-----------|------|---------|
| `source` | 由按钮触发打开 | 只有出度，没有入度 |
| `target` | 外部传入数据时自动打开 | 只有入度，没有出度 |
| `both` | 既可由按钮触发，也可自动打开 | 既有入度又有出度 |
| `standalone` | 独立弹窗，仅由按钮触发 | 没有入度和出度 |

### 4. Container（容器组件）

通过嵌套 `components` + `DataFlow` 结构自动识别：

```json
{
  "HeaderPanel": {
    "components": {
      "QuickSearch": {
        "Type": "Form",
        "Fields": [],
        "url": { "query": "/api/search" }
      },
      "QuickResult": {
        "Type": "Table",
        "Fields": []
      }
    },
    "DataFlow": {
      "links": [
        { "from": "IN",        "to": "QuickSearch" },
        { "from": "QuickSearch",  "to": "QuickResult" },
        { "from": "QuickResult",  "to": "OUT" }
      ]
    }
  }
}
```

Container 的关键特性：

- **IN 虚拟节点**：容器从外部接收数据时，使用 `{ "from": "IN", "to": "子组件名" }`
- **OUT 虚拟节点**：容器向外部输出数据时，使用 `{ "from": "子组件名", "to": "OUT" }`

---

## 数据流 (DataFlow)

数据流定义了组件之间的数据传递方向，是工具的核心能力。

### 基本语法

```json
"DataFlow": {
  "links": [
    { "from": "SourceName", "to": "TargetName" }
  ]
}
```

### 数据流模式

| 模式 | 说明 | 示例 |
|------|------|------|
| `Form → Table` | 表单查询 → 表格展示结果 | 搜索条件提交后刷新表格 |
| `Table → Form` | 点击表格行 → 弹窗表单回显 | 点击用户行，编辑弹窗自动填充 |
| `Table → Table` | 点击主表行 → 明细表加载 | 点击订单行，下方显示订单明细 |
| `Form → Form` | 表单 A 选择 → 表单 B 联动刷新 | 选择省份后，城市下拉联动更新 |
| `Container → Container` | 容器间传递数据 | 筛选面板 → 详情面板 |
| `→ OUT` | 向页面父级输出数据 | 选中行传递给页面级变量 |

### 数据流示意图

```text
┌─────────────────────────────────────────────────────────┐
│  场景 1: CRUD 用户管理                                   │
│                                                         │
│  SearchForm ──formToTable──► UserTable                   │
│       ▲                              │                   │
│       │                              │ tableToForm       │
│       │                              ▼                   │
│       │                      EditUserModal               │
│       │                                                   │
│  AddUserModal ──formToTable──► UserTable                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  场景 8: 复杂仪表盘                                     │
│                                                         │
│  DateFilter ───formToContainer──► SummaryPanel            │
│       │                              │                   │
│       │                              │ containerToContainer
│       │                              ▼                   │
│       └──formToContainer──► DetailPanel                   │
│                                       │                  │
│                               SummaryPanel ──containerToForm──► ExportModal
└─────────────────────────────────────────────────────────┘
```

---

## 字段类型

### Input（文本输入）

```json
{ "name": "USER_NAME", "type": "Input", "label": "用户名" }
```

### Select（下拉选择）

```json
{
  "name": "DEPT_ID",
  "type": "Select",
  "label": "部门",
  "options": [
    { "value": "D001", "label": "技术部" },
    { "value": "D002", "label": "市场部" }
  ]
}
```

### DatePicker（日期选择）

```json
{ "name": "ORDER_DATE", "type": "DatePicker", "label": "下单日期" }
```

### InputNumber（数字输入）

```json
{ "name": "SORT_ORDER", "type": "InputNumber", "label": "排序" }
```

### 字段通用属性

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 字段名（也是 dataIndex） |
| `type` | string | ✅ | `Input`, `Select`, `DatePicker`, `InputNumber` |
| `label` | string | ✅ | 中文标签 |
| `disabled` | boolean | ❌ | 是否禁用（默认 `false`） |
| `options` | array | 仅 Select | 下拉选项，每项 `{ value, label }` |

---

## API 配置

每个 Form/Table 组件可通过 `url` 配置后端 API 地址，工具会自动生成 API 调用代码：

```json
{
  "url": {
    "load":  "/api/user/detail",     // 初始化加载（GET）
    "query": "/api/user/list",        // 查询提交（POST）
    "save":  "/api/user/update"       // 保存提交（POST）
  }
}
```

| API 类型 | 适用组件 | 请求方法 | 触发时机 |
|----------|---------|----------|---------|
| `load` | Form, Table | GET | 组件挂载时自动调用 |
| `query` | Form | POST | 用户点击查询按钮时 |
| `save` | Form (含 Modal 表单) | POST | 用户点击保存按钮时 |

生成的代码使用 `import request from '@/utils/request'`，你需要在项目中实现这个 request 工具或替换为你的 HTTP 客户端。

---

## 数据字典 (Select 动态选项)

Select 字段支持两种选项来源：

1. **静态选项** — 在字段的 `options` 数组中直接定义
2. **动态字典** — 通过字段的 `dictName` 属性指定字典名称，编译时自动生成异步加载代码

### 用法

在字段配置中添加 `dictName` 即可，**不需要**再写 `options`：

```json
{
  "name": "DEPT",
  "type": "Select",
  "label": "部门",
  "dictName": "SYS_DEPT"
}
```

生成的代码：

```jsx
const [DEPT_options, setDEPT_options] = useState([]);

useEffect(() => {
  const loadDict = async () => {
    const res = await DataDict.getDict('SYS_DEPT');
    setDEPT_options(res || []);
  };
  loadDict();
}, []);

// JSX 中使用 options 属性绑定
<Select placeholder="请选择部门" options={DEPT_options} />
```

### 混合使用

字典字段和静态 options 可以混用，互不干扰：

```json
{
  "Fields": [
    { "name": "DEPT",  "type": "Select", "label": "部门", "dictName": "SYS_DEPT" },
    { "name": "STATUS", "type": "Select", "label": "状态", "options": [
      { "value": "1", "label": "启用" },
      { "value": "0", "label": "停用" }
    ]}
  ]
}
```

### 自定义字典调用

默认使用 `DataDict.getDict('字典名')`，可通过 `src/config/dict.js` 修改：

```js
// src/config/dict.js
const dictConfig = {
  importStatement: "import { getDict } from '@/api/dict';",
  method:          "getDict('{{dictName}}')",
  labelField:      "text",     // 返回数据中用作展示文本的字段
  valueField:      "id",       // 返回数据中用作选项值的字段
};
```

如果 `labelField` 和 `valueField` 不是默认的 `label`/`value`，工具会自动生成 map 转换。

---

## 请求层自定义

生成的代码默认使用 `request.get()` / `request.post()` 调用 API，响应列表数据从 `res.LIST` 读取。
你可以通过修改 `src/config/request.js` 来适配项目已有的 HTTP 客户端。

### 配置项

methods 的 key 直接对应 url 类型：

| 配置 key | 对应 url 字段 | 语义 | 传参 |
|----------|--------------|------|------|
| `load` | `url.load` | 组件挂载时初始化加载 | `{{config}}`（配置参数） |
| `query` | `url.query` | 查询/搜索提交 | `{{data}}`（表单数据） |
| `save` | `url.save` | 新增/编辑保存 | `{{data}}`（表单数据） |

```js
// src/config/request.js
const requestConfig = {
  // import 语句模板
  importStatement: "import request from '@/utils/request';",

  // 请求方法调用模板
  //   {{url}}    → 替换为 API 地址（需自行加引号）
  //   {{data}}   → 替换为请求体变量名
  //   {{config}} → 替换为配置参数变量名
  methods: {
    load:  "request.get('{{url}}', {{config}})",
    query: "request.post('{{url}}', {{data}})",
    save:  "request.post('{{url}}', {{data}})",
  },

  // 列表中数据所在的响应字段路径
  listField: 'LIST',
};
```

### 常见适配示例

#### 全部使用 POST（你的项目场景）

如果项目无论加载、查询、保存都只用 POST：

```js
const requestConfig = {
  importStatement: "import api from '@/utils/api';",
  methods: {
    load:  "api.post('{{url}}', {{config}})",
    query: "api.post('{{url}}', {{data}})",
    save:  "api.post('{{url}}', {{data}})",
  },
  listField: 'data.records',
};
```

#### 使用 axios

```js
const requestConfig = {
  importStatement: "import axios from 'axios';",
  methods: {
    load:  "axios.get('{{url}}', { params: {{config}} })",
    query: "axios.get('{{url}}', { params: {{data}} })",
    save:  "axios.post('{{url}}', {{data}})",
  },
  listField: 'data.list',
};
```

#### 使用静态 Mock（无后端请求）

```js
const requestConfig = {
  importStatement: "import mockData from '@/mock/data';",
  methods: {
    load:  "Promise.resolve(mockData['{{url}}'])",
    query: "Promise.resolve(mockData['{{url}}'])",
    save:  "Promise.resolve(mockData['{{url}}'])",
  },
  listField: 'LIST',
};
```

---

## 容器嵌套

容器组件可以任意嵌套，实现复杂页面布局：

```text
┌─────────────────────────────────────────────────────────┐
│  顶层 Container（Dashboard）                             │
│                                                         │
│  ┌─ DateFilter (Form) ─────────────────────────────┐    │
│  │  开始日期 [____] 结束日期 [____] [查询] [重置]    │    │
│  └──────────────────────────────────────────────────┘    │
│         │                    │                           │
│         ▼                    ▼                           │
│  ┌─ SummaryPanel (Container) ─┐ ┌─ DetailPanel (Container)┐
│  │ 汇总类型 [▼]              │ │ 明细ID [disabled]       │
│  │ ┌───Table──────────┐      │ │ ┌───Table──────────┐   │
│  │ │ 指标名 │ 当前值  │      │ │ │ 项目名 │ 项目值  │   │
│  │ └─────────────────┘      │ │ └─────────────────┘   │
│  └──────────────────────────┘ └────────────────────────┘
│         │                                               │
│         ▼                                               │
│  ┌─ ExportModal (Modal Form) ──────────────────────┐    │
│  │  导出格式 [▼]  数据日期 [____]                   │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 嵌套规则

- 任何组件如果包含 `components` + `DataFlow` 字段，自动识别为 Container
- Container 内部可再包含 Form、Table、Modal、子 Container
- IN/OUT 虚拟节点在 Container 边界上传递数据

---

## Modal 弹窗

Modal 组件支持在**顶层页面**和**Container 内部**两种场景使用。

### 页面级 Modal（顶层）

直接在 `components` 下定义 `Layout: "Modal"` 的组件：

```json
{
  "components": {
    "SearchForm": { "Type": "Form", "Fields": [], "url": { "query": "/api/search" } },
    "ResultModal": { "Type": "Table", "Layout": "Modal", "Fields": [] },
    "ConfigModal": { "Type": "Form", "Layout": "Modal", "Fields": [], "url": { "save": "/api/config" } }
  },
  "DataFlow": {
    "links": [
      { "from": "SearchForm", "to": "ResultModal" },
      { "from": "ResultModal", "to": "OUT" }
    ]
  }
}
```

生成的页面会自动：
- 为 `source`/`standalone` Modal 生成触发按钮
- 为 `target`/`both` Modal 生成自动打开逻辑（收到数据时弹出）

### Container 内 Modal

在 Container 的 `components` 内定义 Modal 即可，行为与页面级一致。

---

## 完整场景示例

### CRUD 用户管理（场景 1）

```json
{
  "components": {
    "SearchForm": {
      "Type": "Form",
      "Fields": [
        { "name": "USER_NAME", "type": "Input", "label": "用户名" },
        { "name": "STATUS", "type": "Select", "label": "状态", "options": [
          { "value": "1", "label": "启用" }, { "value": "0", "label": "停用" }
        ]}
      ],
      "url": { "query": "/api/user/list" }
    },
    "UserTable": {
      "Type": "Table",
      "Fields": [
        { "name": "USER_NAME", "label": "用户名" },
        { "name": "DEPT_NAME", "label": "部门" },
        { "name": "STATUS", "label": "状态" },
        { "name": "EMAIL", "label": "邮箱" },
        { "name": "CREATE_TIME", "label": "创建时间" }
      ],
      "url": { "load": "/api/user/page" }
    },
    "AddUserModal": {
      "Type": "Form", "Layout": "Modal",
      "Fields": [
        { "name": "USER_NAME", "type": "Input", "label": "用户名" },
        { "name": "DEPT_ID", "type": "Select", "label": "部门", "options": [
          { "value": "D001", "label": "技术部" }, { "value": "D002", "label": "市场部" }
        ]},
        { "name": "EMAIL", "type": "Input", "label": "邮箱" }
      ],
      "url": { "save": "/api/user/add" }
    },
    "EditUserModal": {
      "Type": "Form", "Layout": "Modal",
      "Fields": [
        { "name": "USER_ID", "type": "Input", "label": "用户ID", "disabled": true },
        { "name": "USER_NAME", "type": "Input", "label": "用户名" },
        { "name": "STATUS", "type": "Select", "label": "状态", "options": [
          { "value": "1", "label": "启用" }, { "value": "0", "label": "停用" }
        ]}
      ],
      "url": { "load": "/api/user/detail", "save": "/api/user/update" }
    }
  },
  "DataFlow": {
    "links": [
      { "from": "SearchForm", "to": "UserTable" },
      { "from": "AddUserModal", "to": "UserTable" },
      { "from": "EditUserModal", "to": "UserTable" },
      { "from": "UserTable", "to": "EditUserModal" },
      { "from": "UserTable", "to": "OUT" }
    ]
  }
}
```

### 主从表（场景 2）

```json
{
  "components": {
    "OrderPage": {
      "components": {
        "OrderSearch": {
          "Type": "Form",
          "Fields": [
            { "name": "ORDER_NO", "type": "Input", "label": "订单号" },
            { "name": "ORDER_DATE", "type": "DatePicker", "label": "下单日期" },
            { "name": "CUSTOMER", "type": "Input", "label": "客户名称" }
          ],
          "url": { "query": "/api/order/search" }
        },
        "OrderTable": {
          "Type": "Table",
          "Fields": [
            { "name": "ORDER_NO", "label": "订单号" },
            { "name": "CUSTOMER", "label": "客户" },
            { "name": "TOTAL_AMOUNT", "label": "总金额" },
            { "name": "ORDER_DATE", "label": "下单日期" },
            { "name": "STATUS", "label": "状态" }
          ],
          "url": { "load": "/api/order/list" }
        },
        "OrderDetailTable": {
          "Type": "Table",
          "Fields": [
            { "name": "PRODUCT_NAME", "label": "商品名称" },
            { "name": "QUANTITY", "label": "数量" },
            { "name": "PRICE", "label": "单价" },
            { "name": "AMOUNT", "label": "小计" }
          ],
          "url": { "load": "/api/order/detail" }
        }
      },
      "DataFlow": {
        "links": [
          { "from": "OrderSearch", "to": "OrderTable" },
          { "from": "OrderTable", "to": "OrderDetailTable" },
          { "from": "OrderDetailTable", "to": "OUT" }
        ]
      }
    }
  }
}
```

---

## 数据流行为参考

当 `links` 中定义组件间连接时，工具根据源和目标组件类型自动推导连接行为：

| 源类型 | 目标类型 | 行为标识 | 代码效果 |
|--------|---------|---------|---------|
| Form | Table | `formToTable` | Form 提交 → 设置 Table 的 dataSource |
| Table | Form | `tableToForm` | 行点击 → Form 回显数据（setFieldsValue） |
| Table | Table | `tableToTable` | 行点击参数 → 加载目标明细表 |
| Form | Form | `formToForm` | Select 变化 → 联动加载目标表单 |
| Form | Container | `formToContainer` | Form 提交 → 透传给容器 IN |
| Table | Container | `tableToContainer` | 行点击 → 透传给容器 IN |
| Container | Container | `containerToContainer` | 容器数据透传 |
| Container | Form | `containerToForm` | 容器数据 → 表单回显 |
| Container | Table | `containerToTable` | 容器数据 → 表格展示 |
| 任意 | OUT | `toOut` | 数据输出到页面级变量 |

---

## 输出文件结构

每次运行生成如下结构：

```text
<输出目录>/
├── index.jsx                          # 页面入口，组装所有顶层组件
└── components/
    ├── <组件名1>.jsx                    # 顶层组件（Form/Table/Modal/Container）
    ├── <组件名2>.jsx                    # ...
    └── ...
```

对于 Container 组件，其所有子组件**内联**在同一个文件中，不生成额外文件。

### 生成的代码特点

- ✅ 使用 **Prettier** 自动格式化
- ✅ 使用 **WeakMap** 实现稳定的行唯一标识（避免重渲染问题）
- ✅ Modal 弹窗自动管理 `open`/`close` 状态
- ✅ 目标弹窗自动打开（收到数据时弹出）
- ✅ 空数据/加载中/错误状态均有处理
- ✅ 表单支持日期的 dayjs 转换回显

---

## 开发指南

### 项目结构

```text
code-generator/
├── bin/
│   └── generate.js          # CLI 入口
├── examples/
│   ├── test-scenario-01-crud.json       # CRUD 场景
│   ├── test-scenario-02-master-detail.json  # 主从表
│   ├── test-scenario-03-form-to-form.json   # 表单联动
│   ├── test-scenario-04-top-level-modal.json # 顶层 Modal
│   ├── test-scenario-05-all-field-types.json # 全字段类型
│   ├── test-scenario-06-container-in-container.json # 容器嵌套
│   ├── test-scenario-07-only-tables.json  # 纯表格联动
│   ├── test-scenario-08-complex-dashboard.json # 复杂仪表盘
│   └── modal-test.json                   # Modal 测试
├── src/
│   ├── config/defaults.js         # 默认配置
│   ├── core/
│   │   ├── parser.js              # JSON 配置解析
│   │   ├── modelBuilder.js        # 组件模型构建
│   │   ├── eventBinder.js         # 事件绑定推导
│   │   └── renderer.js            # 代码渲染引擎
│   ├── templates/
│   │   ├── atoms.js               # 字段级原子模板
│   │   ├── index.js               # 页面模板
│   │   └── components/
│   │       ├── index.js           # 组件模板注册中心
│   │       ├── Form.js            # Form 模板
│   │       ├── Table.js           # Table 模板
│   │       └── Container.js       # Container 模板
│   └── utils/
│       ├── fileWriter.js          # 文件写入（Prettier 格式化）
│       └── logger.js              # 命令行日志
└── package.json
```

### 扩展组件类型

新增组件类型（如 `Chart`、`Tree`）只需要：

1. 在 `src/templates/components/` 下新建文件（如 `Chart.js`）
2. 实现 `generate(params)` 函数，返回 `{ code: string }`
3. 在 `src/templates/components/index.js` 中注册

```js
// src/templates/components/Chart.js
function generate({ name, comp, fieldsCode }) {
  const code = `
const ${name} = (props) => {
  return <div>Chart: ${name}</div>;
};
export default ${name};
`;
  return { code };
}
module.exports = { generate };

// src/templates/components/index.js 中注册
registry['Chart'] = require('./Chart').generate;
```

### 运行测试场景

```bash
# 运行单个场景
node bin/generate.js -c examples/test-scenario-01-crud.json -o ./output -n UserManage

# 运行所有场景
for f in examples/test-scenario-*.json; do
  name=$(basename "$f" .json)
  node bin/generate.js -c "$f" -o "./output/$name" -n "$name"
done
```

---

## License

MIT
