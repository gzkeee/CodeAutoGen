/**
 * Container 组件模板 - 生成复合组件的 JSX 代码
 *
 * V7.1 版本：
 * - 所有子组件内联到同一个文件中（const 函数），不生成独立文件
 * - Modal 子组件：拥有独立的数据状态 + visible 状态 + 自动打开效果
 * - API 请求内联在子组件中
 */

function generate({ name, comp, childrenOutput, requestConfig, dictConfig }) {
  const childEntries = Object.entries(comp.children.componentMap);
  const childLinks = comp.children.links || [];
  const hasIn = comp.hasIn;
  const hasOut = comp.hasOut;

  // Determine which child receives IN data
  const inTarget = hasIn ? childLinks.find((l) => l.from === 'IN') : null;
  // Determine which child produces OUT data
  const outSource = hasOut ? childLinks.find((l) => l.to === 'OUT') : null;

  // Identify Modal children
  const modalChildren = childEntries.filter(([, child]) => child.layout === 'Modal');
  const modalChildIds = new Set(modalChildren.map(([id]) => id));

  // Build inline child const declarations (replace imports)
  const childDeclarations = childEntries.map(([id, child]) => {
    const childOutput = childrenOutput.find((o) => o.id === id);
    const childCode = childOutput ? childOutput.code : '';
    return `// ============================================================
// 子组件 ${id}
// ============================================================
${childCode}`;
  }).join('\n\n');

  // Build data state declarations for ALL children (Modal and non-Modal)
  const stateDeclarations = childEntries.map(([id, child]) => {
    const initVal = child.type === 'Table' ? '[]' : '{}';
    return `  const [${id}Data, set${id}Data] = useState(${initVal});`;
  }).join('\n');

  // Build open state declarations for Modal children
  const modalStateDeclarations = modalChildren.map(([id]) => {
    return `  const [${id}Open, set${id}Open] = useState(false);`;
  }).join('\n');

  // Build auto-open effects for Modal children that receive data
  const modalOpenEffects = modalChildren
    .filter(([, child]) => child.modalRole === 'target' || child.modalRole === 'both')
    .map(([id]) => {
      return `
  useEffect(() => {
    if (${id}Data && (Array.isArray(${id}Data) ? ${id}Data.length > 0 : Object.keys(${id}Data).length > 0)) {
      set${id}Open(true);
    }
  }, [${id}Data]);`;
    }).join('');

  // Build output state (for OUT virtual node)
  let outputState = '';
  let outputEffect = '';
  if (hasOut) {
    outputState = `\n  const [outputData, setOutputData] = useState(null);`;

    outputEffect = `

  // OUT: 将输出数据传递给父级
  useEffect(() => {
    if (outputData && props.setValue) {
      props.setValue(outputData);
    }
  }, [outputData, props.setValue]);`;
  }

  // Build IN effect: external value → internal state
  let inEffect = '';
  if (hasIn && inTarget) {
    inEffect = `

  // IN: 当外部传入的 value 变化时更新内部状态
  useEffect(() => {
    if (props.value) {
      set${inTarget.to}Data(props.value);
    }
  }, [props.value]);`;
  }

  // Combine all state declarations
  const allStateDeclarations = [stateDeclarations, modalStateDeclarations].filter(Boolean).join('\n');

  // Build trigger buttons for Modal source/standalone children
  let headerButtons = '';
  const modalTriggerChildren = modalChildren.filter(([, child]) => {
    return child.modalRole === 'source' || child.modalRole === 'both' || child.modalRole === 'standalone';
  });

  if (modalTriggerChildren.length > 0) {
    const buttons = modalTriggerChildren.map(([id, child]) => {
      const btnLabel = child.fields && child.fields.length > 0 ? child.fields[0].label : id;
      return `        <Button type="primary" onClick={() => set${id}Open(true)}>${btnLabel}</Button>`;
    }).join('\n');
    headerButtons = `
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3>${name}</h3>
        <div>
${buttons}
        </div>
      </div>`;
  }

  // Build child renders with state wiring
  const childRenders = childEntries.map(([id, child]) => {
    const propsList = [];

    if (modalChildIds.has(id)) {
      // Modal children: pass open, setOpen, value, and setValue
      propsList.push(`open={${id}Open}`);
      propsList.push(`setOpen={set${id}Open}`);
      propsList.push(`value={${id}Data}`);

      // setValue for outgoing data (to non-OUT targets)
      const outgoingToChildren = childLinks.filter((l) => l.from === id && l.to !== 'OUT');
      if (outgoingToChildren.length > 0) {
        outgoingToChildren.forEach((ol) => {
          const targetId = ol.to;
          propsList.push(`setValue={set${targetId}Data}`);
        });
      } else {
        propsList.push(`setValue={props.setValue}`);
      }

      return `      <${id} ${propsList.join(' ')} />`;
    }

    // Non-Modal children: value binding
    const incomingLink = childLinks.find((l) => l.to === id && l.from !== 'IN');
    if (incomingLink || (hasIn && id === inTarget?.to)) {
      propsList.push(`value={${id}Data}`);
    } else {
      propsList.push(`value={${id}Data}`);
    }

    // setValue binding: does this child send data to another child or to OUT?
    const outgoingLinks = childLinks.filter((l) => l.from === id);
    outgoingLinks.forEach((ol) => {
      if (ol.to === 'OUT') {
        const alias = child.setValueAliases?.['OUT'] || 'setValue';
        propsList.push(`${alias}={setOutputData}`);
      } else if (modalChildIds.has(ol.to)) {
        // Data goes TO a Modal child — store in target's data state
        const alias = child.setValueAliases?.[ol.to] || 'setValue';
        propsList.push(`${alias}={set${ol.to}Data}`);
      } else {
        const targetId = ol.to;
        const isSingleOut = child.outgoing.length === 1;
        if (isSingleOut) {
          propsList.push(`setValue={set${targetId}Data}`);
        } else {
          const alias = child.setValueAliases?.[targetId];
          if (alias) {
            propsList.push(`${alias}={set${targetId}Data}`);
          } else {
            propsList.push(`setValue={set${targetId}Data}`);
          }
        }
      }
    });

    return `      <${id} ${propsList.join(' ')} />`;
  }).join('\n');

  // Build final code
  const rc = requestConfig || { importStatement: "import request from '@/utils/request';", methods: { load: "request.get('{{url}}', {{config}})", query: "request.post('{{url}}', {{data}})", save: "request.post('{{url}}', {{data}})" }, listField: 'LIST' };
  const dc = dictConfig || {};
  const hasDateChildren = childrenOutput.some(o => o.comp.fields && o.comp.fields.some(f => f.type === 'DatePicker'));
  const hasDictChildren = childrenOutput.some(o => o.comp.fields && o.comp.fields.some(f => f.type === 'Select' && f.dictName));

  const code = `import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, Modal, DatePicker, InputNumber, message } from 'antd';
${rc.importStatement}
${hasDateChildren ? "import dayjs from 'dayjs';" : ''}
${hasDictChildren ? (dc.importStatement || "import DataDict from '@/utils/DataDict';") : ''}

${childDeclarations}

// ============================================================
// 容器组件 ${name}
// ============================================================
const ${name} = (props) => {
${allStateDeclarations}${modalOpenEffects}${outputState}${inEffect}${outputEffect}

  return (
    <div style={{ border: '1px solid #ddd', padding: '16px', marginBottom: '16px' }}>${headerButtons}
${childRenders}
    </div>
  );
};

export default ${name};
`;

  return { code };
}

module.exports = { generate };
