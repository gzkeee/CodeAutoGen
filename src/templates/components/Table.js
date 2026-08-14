/**
 * Table 组件模板 - 生成数据展示表格的 JSX 代码
 * API 调用直接内联在组件中
 * 支持 Modal 模式（Layout: "Modal"）
 * 支持 inline 模式（嵌入到 Container 中，不带 import/export）
 */

const { buildRequestCall, resolveListField } = require('../../utils/requestHelper');

function generate({ name, comp, tableColumns, eventCode, pkField, incomingBehavior, inline, requestConfig }) {
  const rc = requestConfig || { importStatement: "import request from '@/utils/request';", methods: { load: "request.get('{{url}}', {{config}})", query: "request.post('{{url}}', {{data}})", save: "request.post('{{url}}', {{data}})" }, listField: 'LIST' };
  const hasLoad = !!comp.url.load;
  const hasSave = !!comp.url.save;
  const hasOnRowEvents = eventCode.some((e) => e.prop === 'onRow');
  const isTableToTableTarget = incomingBehavior === 'tableToTable';
  const isModal = comp.layout === 'Modal';

  const needsInitLoad = hasLoad && !incomingBehavior;
  const needsValueLoad = hasLoad && incomingBehavior === 'tableToTable';

  const eventMap = new Map();
  eventCode.forEach((evt) => {
    if (!eventMap.has(evt.prop)) eventMap.set(evt.prop, []);
    eventMap.get(evt.prop).push(evt);
  });

  const fdefs = comp.fields || [];

  const antdImports = ['Table'];
  antdImports.push('message');
  if (isModal) antdImports.push('Modal');
  if (fdefs.some((f) => f.type === 'Input' || !f.type)) antdImports.push('Input');

  const uniqueAntd = [...new Set(antdImports)].sort();

  const columnsVarName = inline ? `${name}_columns` : 'columns';
  const listFieldExpr = resolveListField(rc);

  // Header: imports (only in standalone mode)
  let code = '';
  if (!inline) {
    code += `import React, { useState, useEffect } from 'react';
import { ${uniqueAntd.join(', ')} } from 'antd';
${rc.importStatement}

`;
  }

  // Component declaration
  code += `const ${name} = (props) => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);`;

  // Modal open/setOpen props + setValue aliases
  if (isModal) {
    const setValueProps = Object.entries(comp.setValueAliases || {});
    if (setValueProps.length > 0) {
      const destructured = setValueProps.map(([_, alias]) => alias).join(', ');
      code += `
  const { open, setOpen, value, ${destructured} } = props;`;
    } else {
      code += `
  const { open, setOpen, value } = props;`;
    }
  }

  // Init load effect
  if (needsInitLoad) {
    const loadCall = buildRequestCall(rc, 'load', comp.url.load);
    code += `

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await ${loadCall};
        if (res && res['${listFieldExpr}']) {
          setDataSource(res['${listFieldExpr}']);
        }
      } catch (error) {
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);`;
  }

  // Table→Table: 上游表格传入行数据 → 加载明细
  if (needsValueLoad) {
    const loadCall = buildRequestCall(rc, 'load', comp.url.load);
    code += `

  useEffect(() => {
    const loadByValue = async () => {
      if (props.value && typeof props.value === 'object' && Object.keys(props.value).length > 0) {
        setLoading(true);
        try {
          const res = await ${loadCall};
          if (res && res['${listFieldExpr}']) {
            setDataSource(res['${listFieldExpr}']);
          }
        } catch (error) {
          message.error('加载数据失败');
        } finally {
          setLoading(false);
        }
      }
    };
    loadByValue();
  }, [props.value]);`;
  }

  // Save handler
  if (hasSave) {
    const saveCall = buildRequestCall(rc, 'save', comp.url.save);
    code += `

  const handleSave = async (values) => {
    try {
      const res = await ${saveCall};
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };`;
  }

  // Props destructuring (non-modal)
  if (!isModal) {
    const setValueProps = Object.entries(comp.setValueAliases || {});
    if (setValueProps.length > 0) {
      const destructured = setValueProps.map(([_, alias]) => alias).join(', ');
      code += `
  const { value, ${destructured} } = props;`;
    } else {
      code += `
  const { value } = props;`;
    }
  }

  // onRow handler
  if (hasOnRowEvents) {
    const onRowEvents = eventMap.get('onRow');
    code += `

  const handleRowClick = (record) => {
    ${onRowEvents.map((evt) => {
      return `if (${evt.data.alias}) ${evt.data.alias}(record);`;
    }).join('\n    ')}
  };`;
  }

  const rowEventCode = hasOnRowEvents
    ? `onRow={(record) => ({
          onClick: () => handleRowClick(record),
        })}`
    : '';

  const dataSourceExpr = 'Array.isArray(value) && value.length > 0 ? value : dataSource';

  // Render: Modal mode
  if (isModal) {
    const modalTitle = fdefs.length > 0 ? fdefs[0].label : name;

    code += `

  return (
    <Modal
      title="${modalTitle}"
      open={open}
      onCancel={() => setOpen ? setOpen(false) : null}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Table
        dataSource={${dataSourceExpr}}
        columns={${columnsVarName}}
                rowKey={(record) => record.id || ${name}_rk(record)}
        loading={loading}
        ${rowEventCode}
      />
    </Modal>
  );
};`;
  } else {
    // Normal mode
    code += `

  return (
    <div>
      <Table
        dataSource={${dataSourceExpr}}
        columns={${columnsVarName}}
                rowKey={(record) => record.id || ${name}_rk(record)}
        loading={loading}
        ${rowEventCode}
      />
    </div>
  );
};`;
  }

  // Row key generator (UUID-like stable unique ID per record)
  code += `

// 行唯一标识生成器 (基于 WeakMap，相同对象返回相同 ID)
const ${name}_rk = (() => { let i = 0; const m = new WeakMap(); return (r) => { if (!m.has(r)) m.set(r, ++i); return m.get(r); }; })();`;

  // Columns definition
  code += `

const ${columnsVarName} = [
  ${tableColumns.join(',\n  ')}
];`;

  // Export (only in standalone mode)
  if (!inline) {
    code += `

export default ${name};
`;
  }

  return { code };
}

module.exports = { generate };
