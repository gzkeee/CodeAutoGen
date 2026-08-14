/**
 * 组件模板注册中心
 *
 * 每种组件类型对应一个独立的模板模块，统一接口:
 *   generate({ name, comp, fieldsCode, tableColumns, eventCode, pkField, incomingBehavior, loadPkField })
 *   → { code: string }
 *
 * 新增组件类型只需:
 *   1. 在 ./components/ 下新建文件 (如 Chart.js)
 *   2. 在此注册: registry['Chart'] = require('./Chart').generate
 */

const registry = {
  Form: require('./Form').generate,
  Table: require('./Table').generate,
  Container: require('./Container').generate,
};

function generateComponentCode(params) {
  const { comp, requestConfig } = params;
  const generator = registry[comp.type];

  if (!generator) {
    throw new Error(`不支持的组件类型: "${comp.type}"，可用类型: ${Object.keys(registry).join(', ')}`);
  }

  return generator(params);
}

/**
 * 注册新的组件类型模板
 * @param {string} typeName - 组件类型名称 (如 'Chart', 'Tree')
 * @param {function} generator - generate(params) => { code: string }
 */
function registerComponent(typeName, generator) {
  if (registry[typeName]) {
    console.warn(`组件类型 "${typeName}" 已被注册，将覆盖`);
  }
  registry[typeName] = generator;
}

module.exports = { generateComponentCode, registerComponent, registry };
