/**
 * 请求层配置
 * ============
 *
 * 本文件用于自定义生成的 React 代码中 HTTP 请求的调用方式。
 * 默认使用 request.get / request.post + import request from '@/utils/request'
 * 你可以根据项目实际情况修改为 axios、fetch、或自定义 http 客户端。
 *
 * 配置项说明见 defaults.js 中的 request 段。
 *
 * methods 的 key 直接对应 url 类型：
 *   load  → 组件挂载时初始化加载（url.load），通常传配置参数
 *   query → 查询/搜索提交（url.query），通常传表单数据
 *   save  → 新增/编辑保存（url.save），通常传表单数据
 *
 * 如果你的项目全部使用 POST，只需三个都配成 post 即可：
 *   methods: { load: "api.post('{{url}}', {{config}})", query: "api.post('{{url}}', {{data}})", save: "api.post('{{url}}', {{data}})" }
 *
 * ─── 示例 1: axios ───────────────────────────────────────────
 *   importStatement: "import axios from 'axios';"
 *   methods:
 *     load:  "axios.get('{{url}}', { params: {{config}} })"
 *     query: "axios.get('{{url}}', { params: {{data}} })"
 *     save:  "axios.post('{{url}}', {{data}})"
 *   listField: "data.list"
 *
 * ─── 示例 2: 全部用 POST ──────────────────────────────────────
 *   importStatement: "import { api } from '@/utils/api';"
 *   methods:
 *     load:  "api.post('{{url}}', {{config}})"
 *     query: "api.post('{{url}}', {{data}})"
 *     save:  "api.post('{{url}}', {{data}})"
 *   listField: "data.records"
 *
 * ─── 示例 3: fetch ────────────────────────────────────────────
 *   importStatement: ""
 *   methods:
 *     load:  "fetch('{{url}}', { method: 'POST', body: JSON.stringify({{config}}) }).then(r => r.json())"
 *     query: "fetch('{{url}}', { method: 'POST', body: JSON.stringify({{data}}) }).then(r => r.json())"
 *     save:  "fetch('{{url}}', { method: 'POST', body: JSON.stringify({{data}}) }).then(r => r.json())"
 *   listField: "list"
 *
 * ─── 示例 4: static mock (不请求后端) ─────────────────────────
 *   importStatement: "import mockData from '@/mock/data';"
 *   methods:
 *     load:  "Promise.resolve(mockData['{{url}}'])"
 *     query: "Promise.resolve(mockData['{{url}}'])"
 *     save:  "Promise.resolve(mockData['{{url}}'])"
 *   listField: "LIST"
 */

const requestConfig = {
  // 示例：全 POST 调用
  // importStatement: "import api from '@/utils/api';",
  // methods: {
  //   load:  "api.post('{{url}}', {{config}})",
  //   query: "api.post('{{url}}', {{data}})",
  //   save:  "api.post('{{url}}', {{data}})",
  // },
  // listField: 'data.records',
};

module.exports = requestConfig;
