/**
 * 根据配置的请求方法模板字符串，生成实际的调用代码
 *
 * methods 的 key 对应 url 类型：
 *   load  → 组件挂载时初始化加载
 *   query → 查询/搜索提交
 *   save  → 新增/编辑保存
 *
 * @param {object} requestConfig - 请求配置 { methods: { load, query, save }, listField, importStatement }
 * @param {string} methodKey - 'load' | 'query' | 'save'
 * @param {string} url - API 地址
 * @param {string} dataVar - 请求体变量名（query/save 用）
 * @param {string} configVar - 配置参数变量名（load 用）
 * @returns {string} 生成的调用代码，如 "request.get('/api/user/list', undefined)"
 */
function buildRequestCall(requestConfig, methodKey, url, dataVar, configVar) {
  const tmpl = requestConfig.methods[methodKey];
  if (!tmpl) {
    // 降级：使用默认 request 风格
    return `request.${methodKey === 'load' ? 'get' : 'post'}('${url}', ${methodKey === 'load' ? configVar : dataVar})`;
  }
  return tmpl
    .replace(/\{\{url\}\}/g, url)
    .replace(/\{\{data\}\}/g, dataVar || 'values')
    .replace(/\{\{config\}\}/g, configVar || 'undefined');
}

/**
 * 解析响应中的列表数据字段路径
 *
 * @param {object} requestConfig - 请求配置 { listField }
 * @returns {string} 如 "LIST" 或 "data.list" 或 "data.records"
 */
function resolveListField(requestConfig) {
  return (requestConfig && requestConfig.listField) || 'LIST';
}

module.exports = { buildRequestCall, resolveListField };
