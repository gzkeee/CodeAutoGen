/**
 * 页面模板 - 生成根容器 index.jsx
 * V7.1: 扁平组件 + Modal 支持 + 目标弹窗自动打开
 */

function templateIndex({ pageName, componentMap }) {
  const entries = Object.entries(componentMap);

  const stateDeclarations = entries.map(([id, comp]) => {
    const isModal = comp.layout === 'Modal';
    if (comp.isContainer) {
      return `  const [${id}Data, set${id}Data] = useState(null);`;
    }
    if (isModal) {
      return `  const [${id}Data, set${id}Data] = useState(${comp.type === 'Table' ? '[]' : '{}'});`;
    }
    return `  const [${id}Data, set${id}Data] = useState(${comp.type === 'Table' ? '[]' : '{}'});`;
  }).join('\n');

  // Open state declarations for top-level Modal components
  const modalStateDeclarations = entries
    .filter(([, comp]) => comp.layout === 'Modal')
    .map(([id]) => `  const [${id}Open, set${id}Open] = useState(false);`)
    .join('\n');

  // Auto-open effects for target modals (receive data from other components)
  const modalOpenEffects = entries
    .filter(([, comp]) => comp.layout === 'Modal' && (comp.modalRole === 'target' || comp.modalRole === 'both'))
    .map(([id, comp]) => {
      const initVal = comp.type === 'Table' ? '[]' : '{}';
      return `
  useEffect(() => {
    if (${id}Data && (Array.isArray(${id}Data) ? ${id}Data.length > 0 : Object.keys(${id}Data).length > 0)) {
      set${id}Open(true);
    }
  }, [${id}Data]);`;
    }).join('');

  const imports = entries.map(([id]) => {
    return `import ${id} from './components/${id}';`;
  }).join('\n');

  const renders = entries.map(([id, comp]) => {
    const props = [];
    const isModal = comp.layout === 'Modal';

    if (isModal) {
      props.push(`open={${id}Open}`);
      props.push(`setOpen={set${id}Open}`);
      props.push(`value={${id}Data}`);
    } else {
      props.push(`value={${id}Data}`);

      comp.outgoing.forEach((out) => {
        const alias = comp.setValueAliases[out.target];
        if (alias) {
          props.push(`${alias}={set${out.target}Data}`);
        }
      });
    }

    return `      <${id} ${props.join(' ')} />`;
  }).join('\n');

  // Build trigger buttons for top-level Modal source/standalone components
  const headerButtons = entries
    .filter(([, comp]) => comp.layout === 'Modal' && (comp.modalRole === 'source' || comp.modalRole === 'both' || comp.modalRole === 'standalone'))
    .map(([id, comp]) => {
      const btnLabel = comp.fields && comp.fields.length > 0 ? comp.fields[0].label : id;
      return `        <Button type="primary" onClick={() => set${id}Open(true)}>${btnLabel}</Button>`;
    }).join('\n');

  const hasHeaderButtons = !!headerButtons;
  const hasModalEffects = !!modalOpenEffects;

  const combinedStateDeclarations = [stateDeclarations, modalStateDeclarations].filter(Boolean).join('\n');

  return `${hasModalEffects ? "import React, { useState, useEffect } from 'react';" : "import React, { useState } from 'react';"}
${hasHeaderButtons ? "import { Button } from 'antd';" : ''}
${imports}

const ${pageName} = () => {
${combinedStateDeclarations}${modalOpenEffects}

  return (
    <div style={{ padding: '24px' }}>
${hasHeaderButtons ? `      <div style={{ marginBottom: '16px' }}>
${headerButtons}
      </div>` : ''}
${renders}
    </div>
  );
};

export default ${pageName};
`;
}

module.exports = { templateIndex };
