const { bindEvents } = require('./eventBinder');
const { generateFormItemsConfig, generateFormFieldRender, renderTableColumn } = require('../templates/atoms');
const { generateComponentCode } = require('../templates/components');
const { templateIndex } = require('../templates/index');

function getPkField(fields) {
  const id = fields.find((f) => f.name === 'id' || f.name === 'ID');
  if (id) return id.name;
  const processId = fields.find((f) => f.name === 'PROCESS_ID');
  if (processId) return processId.name;
  if (fields.length > 0) return fields[0].name;
  return 'id';
}

function getIncomingBehavior(compId, componentMap) {
  const comp = componentMap[compId];
  for (const incomingId of comp.incoming) {
    const source = componentMap[incomingId];
    if (!source) continue;
    if (source.type === 'Form' && comp.type === 'Table') return 'formToTable';
    if (source.type === 'Table' && comp.type === 'Form') return 'tableToForm';
    if (source.type === 'Table' && comp.type === 'Table') return 'tableToTable';
    if (source.type === 'Form' && comp.type === 'Form') return 'formToForm';
    if (source.isContainer && comp.type === 'Form') return 'containerToForm';
    if (source.isContainer && comp.type === 'Table') return 'containerToTable';
    if (source.type === 'Form' && comp.isContainer) return 'formToContainer';
    if (source.type === 'Table' && comp.isContainer) return 'tableToContainer';
  }
  return null;
}

function render(componentMap, pageName, requestConfig, dictConfig) {
  const allComponents = [];
  const topLevelEntries = Object.entries(componentMap);

  topLevelEntries.forEach(([id, comp]) => {
    renderComponentRecursive(id, comp, componentMap, allComponents, { inline: false, isTopLevel: true, requestConfig, dictConfig });
  });

  const indexContent = templateIndex({ pageName, componentMap });

  return {
    index: indexContent,
    components: allComponents,
  };
}

/**
 * 递归渲染组件
 * @param {string} id - 组件ID
 * @param {object} comp - 组件模型
 * @param {object} componentMap - 当前层级的组件映射
 * @param {Array} allComponents - 收集所有需要输出文件的渲染结果
 * @param {object} options - 渲染选项
 * @param {boolean} options.inline - 是否为内联模式（不生成 import/export）
 * @param {boolean} options.isTopLevel - 是否为顶层组件
 * @returns {{ code: string }} 组件的代码字符串
 */
function renderComponentRecursive(id, comp, componentMap, allComponents, options = {}) {
  const { inline = false, isTopLevel = false, requestConfig, dictConfig } = options;
  const genOpts = { name: id, comp, requestConfig, dictConfig };

  if (comp.isContainer) {
    // Recursively render children as inline code (no separate files for children)
    const childrenOutput = [];
    Object.entries(comp.children.componentMap).forEach(([childId, childComp]) => {
      const childResult = renderComponentRecursive(childId, childComp, comp.children.componentMap, allComponents, { inline: true, isTopLevel: false, requestConfig, dictConfig });
      childrenOutput.push({ id: childId, comp: childComp, code: childResult.code });
    });

    // Render the container itself — always a standalone file
    const result = generateComponentCode({
      ...genOpts,
      childrenOutput,
      isContainerRender: true,
      inline: false,
    });

    allComponents.push({ name: id, code: result.code });
    return { code: result.code };
  }

  // Leaf component (Form / Table)
  const formItemsCode = generateFormItemsConfig(comp.fields);
  const fieldsRenderCode = generateFormFieldRender(comp.fields);
  const tableColumns = comp.fields.map(renderTableColumn);
  let eventCode = [];

  const hasNonFormToForm = comp.outgoing.some((o) => o.behavior !== 'formToForm');
  if (hasNonFormToForm) {
    eventCode = bindEvents(comp);
  }

  const pkField = getPkField(comp.fields);
  const incomingBehavior = getIncomingBehavior(id, componentMap);

  const result = generateComponentCode({
    ...genOpts,
    formItemsCode,
    fieldsRenderCode,
    tableColumns,
    eventCode,
    pkField,
    incomingBehavior,
    componentMap,
    inline,
  });

  // Only add to allComponents if this is a top-level leaf (not inside a Container)
  if (!inline && isTopLevel) {
    allComponents.push({ name: id, code: result.code });
  }

  return { code: result.code };
}

module.exports = { render };
