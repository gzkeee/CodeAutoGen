const fs = require('fs-extra');
const path = require('path');

const BEHAVIORS = {
  FORM_TO_TABLE: 'formToTable',
  TABLE_TO_FORM: 'tableToForm',
  TABLE_TO_TABLE: 'tableToTable',
  FORM_TO_FORM: 'formToForm',
  CONTAINER_TO_CONTAINER: 'containerToContainer',
  CONTAINER_TO_FORM: 'containerToForm',
  CONTAINER_TO_TABLE: 'containerToTable',
  FORM_TO_CONTAINER: 'formToContainer',
  TABLE_TO_CONTAINER: 'tableToContainer',
};

function getBehavior(fromType, toType) {
  if (fromType === 'Form' && toType === 'Table') return BEHAVIORS.FORM_TO_TABLE;
  if (fromType === 'Table' && toType === 'Form') return BEHAVIORS.TABLE_TO_FORM;
  if (fromType === 'Table' && toType === 'Table') return BEHAVIORS.TABLE_TO_TABLE;
  if (fromType === 'Form' && toType === 'Form') return BEHAVIORS.FORM_TO_FORM;
  throw new Error(`不支持的流向: ${fromType} → ${toType}`);
}

function parseConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  const raw = fs.readJsonSync(resolvedPath);

  if (!raw.components || typeof raw.components !== 'object') {
    throw new Error('配置缺少 components 字段或格式不正确');
  }

  const result = parseLevel(raw, '');
  return result;
}

/**
 * 递归解析一层配置
 * @param {object} node - 当前层级的配置节点 { components, DataFlow }
 * @param {string} prefix - 用于错误提示的路径前缀
 */
function parseLevel(node, prefix) {
  const rawComponents = node.components;
  const links = (node.DataFlow && node.DataFlow.links) || [];

  const componentMap = {};

  Object.keys(rawComponents).forEach((id) => {
    const def = rawComponents[id];

    // 判断是否为容器组件 (有嵌套 components + DataFlow)
    if (def.components && def.DataFlow) {
      const childResult = parseLevel(def, prefix ? `${prefix}.${id}` : id);
      const childLinks = def.DataFlow.links || [];

      componentMap[id] = {
        id,
        type: 'Container',
        isContainer: true,
        fields: [],
        url: {},
        incoming: [],
        outgoing: [],
        setValueAliases: {},
        children: childResult,
        hasIn: childLinks.some((l) => l.from === 'IN'),
        hasOut: childLinks.some((l) => l.to === 'OUT'),
      };
    } else {
      // 叶子组件 (Form / Table)
      if (!def.Type || !['Form', 'Table'].includes(def.Type)) {
        const pathStr = prefix ? `${prefix}.${id}` : id;
        throw new Error(`组件 "${pathStr}" 缺少有效的 Type 字段 (Form/Table)，或缺少 components/DataFlow 定义`);
      }
      if (!Array.isArray(def.Fields)) {
        const pathStr = prefix ? `${prefix}.${id}` : id;
        throw new Error(`组件 "${pathStr}" 缺少 Fields 数组`);
      }

      componentMap[id] = {
        id,
        type: def.Type,
        isContainer: false,
        fields: def.Fields || [],
        url: def.url || {},
        layout: def.Layout || null,
        incoming: [],
        outgoing: [],
        setValueAliases: {},
      };
    }
  });

  // 处理 links（跳过 IN/OUT 虚拟节点，这些由容器模板处理）
  links.forEach((link, index) => {
    if (!link.from || !link.to) {
      throw new Error(`links[${index}] 缺少 from 或 to 字段`);
    }

    // IN 虚拟节点：由容器模板处理，跳过行为推导
    if (link.from === 'IN') return;

    const source = componentMap[link.from];

    if (!source) {
      const pathStr = prefix ? `${prefix}.${link.from}` : link.from;
      throw new Error(`links[${index}] 引用了未定义的源组件 "${pathStr}"`);
    }

    // OUT 虚拟节点：注册出站链接，由容器模板处理数据传递
    if (link.to === 'OUT') {
      source.outgoing.push({ target: 'OUT', behavior: 'toOut' });
      return;
    }

    const target = componentMap[link.to];

    if (!target) {
      const pathStr = prefix ? `${prefix}.${link.to}` : link.to;
      throw new Error(`links[${index}] 引用了未定义的目标组件 "${pathStr}"`);
    }

    // 容器→容器：透传行为，通过 IN/OUT 实现数据流
    if (source.isContainer && target.isContainer) {
      source.outgoing.push({ target: link.to, behavior: 'containerToContainer' });
      return;
    }

    // 容器→基本组件 (Container → Form/Table)：直接透传数据
    if (source.isContainer) {
      source.outgoing.push({ target: link.to, behavior: 'containerTo' + target.type });
      return;
    }

    // 基本组件→容器 (Form/Table → Container)：由容器内部 IN 节点接收
    if (target.isContainer) {
      source.outgoing.push({ target: link.to, behavior: source.type + 'ToContainer' });
      return;
    }

    const behavior = getBehavior(source.type, target.type);

    source.outgoing.push({
      target: link.to,
      behavior,
    });
  });

  return { componentMap, links };
}

module.exports = { parseConfig, getBehavior, BEHAVIORS };
