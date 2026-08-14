/**
 * 数据字典配置
 * =============
 *
 * 本文件用于配置数据字典的调用方式。
 * 生成的代码会自动调用 Dict 获取 Select 选项。
 *
 * ─── 默认 ──────────────────────────────────────────────────
 *   importStatement: "import DataDict from '@/utils/DataDict';"
 *   method:          "DataDict.getDict('{{dictName}}')"
 *   labelField:      "label"    ← 返回数据中用作展示文本的字段
 *   valueField:      "value"    ← 返回数据中用作选项值的字段
 *
 * ─── 示例：使用其他字典库 ──────────────────────────────────
 *   importStatement: "import { getDictionary } from '@/api/dict';"
 *   method:          "getDictionary('{{dictName}}')"
 *   labelField:      "text"
 *   valueField:      "id"
 *
 * ─── 示例：使用 axios ──────────────────────────────────────
 *   importStatement: "import axios from 'axios';"
 *   method:          "axios.get('/api/dict/{{dictName}}')"
 *   labelField:      "name"
 *   valueField:      "code"
 */

const dictConfig = {
  // importStatement: "import { getDictionary } from '@/api/dict';",
  // method:          "getDictionary('{{dictName}}')",
  // labelField:      "text",
  // valueField:      "id",
};

module.exports = dictConfig;
