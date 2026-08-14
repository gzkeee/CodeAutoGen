/**
 * 默认配置 - 可被用户自定义配置覆盖
 */
const defaults = {
  pageName: 'Page',
  outputDir: './output',

  /**
   * 请求层配置
   *
   * importStatement — import 语句模板，用于在生成的代码中引入 HTTP 客户端
   *   e.g. "import request from '@/utils/request';"  (默认)
   *        "import axios from 'axios';"
   *        "import { http } from '@/utils/http';"
   *
   * methods — 各请求方法对应生成的调用表达式（模板字符串）
   *   {{url}}  会被替换为 API 地址
   *   {{data}} 会被替换为请求体变量名（POST 类）
   *   {{config}} 会被替换为配置对象变量名（GET 类）
   *
   *   e.g. request.get('{{url}}', {{config}})
   *        request.post('{{url}}', {{data}})
   *        axios.get('{{url}}', {{config}})
   *        http.post('{{url}}', {{data}})
   *        api.get('{{url}}')
   *
   * listField — 响应中列表数据所在的字段路径
   *   e.g. "LIST"        → res.LIST
   *        "data.list"   → res.data.list
   *        "data.records" → res.data.records
   */
  request: {
    importStatement: "import request from '@/utils/request';",
    methods: {
      load:  "request.get('{{url}}', {{config}})",
      query: "request.post('{{url}}', {{data}})",
      save:  "request.post('{{url}}', {{data}})",
    },
    listField: 'LIST',
  },

  pagination: {
    pageSize: 20,
    showSizeChanger: true,
    showTotal: true,
  },
  table: {
    bordered: true,
    size: 'middle',
  },
  form: {
    layout: 'inline',
    labelCol: undefined,
    wrapperCol: undefined,
  },
  primaryKey: 'PROCESS_ID',

  /**
   * 数据字典配置
   *
   * importStatement — import 语句模板
   * method — 调用表达式模板，{{dictName}} 会被替换为字段配置的 dictName
   * labelField — 返回值中用作展示 label 的字段名
   * valueField — 返回值中用作实际 value 的字段名
   */
  dict: {
    importStatement: "import DataDict from '@/utils/DataDict';",
    method: "DataDict.getDict('{{dictName}}')",
    labelField: 'label',
    valueField: 'value',
  },
};

module.exports = defaults;
