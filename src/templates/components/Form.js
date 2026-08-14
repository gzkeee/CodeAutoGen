/**
 * Form 组件模板 - 生成查询表单/编辑表单的 JSX 代码
 * API 调用直接内联在组件中
 * 支持 Modal 模式（Layout: "Modal"）
 * 支持 inline 模式（嵌入到 Container 中，不带 import/export）
 */

const { buildRequestCall, resolveListField } = require('../../utils/requestHelper');
const { generateDictState, generateDictEffects } = require('../../utils/dictHelper');

function generate({ name, comp, formItemsCode, fieldsRenderCode, eventCode, pkField, incomingBehavior, inline, requestConfig, dictConfig }) {
  const rc = requestConfig || { importStatement: "import request from '@/utils/request';", methods: { load: "request.get('{{url}}', {{config}})", query: "request.post('{{url}}', {{data}})", save: "request.post('{{url}}', {{data}})" }, listField: 'LIST' };
  const dc = dictConfig || {};
  const hasLoad = !!comp.url.load;
  const hasQuery = !!comp.url.query;
  const hasSave = !!comp.url.save;
  const hasIncoming = comp.incoming.length > 0;
  const fdefs = comp.fields || [];
  const isModal = comp.layout === 'Modal';

  // 找出使用动态字典的 Select 字段 (有 dictName 且没有内联 options)
  const dictFields = fdefs.filter(f => f.type === 'Select' && f.dictName && (!f.options || f.options.length === 0));

  const eventMap = new Map();
  eventCode.forEach((evt) => {
    if (!eventMap.has(evt.prop)) eventMap.set(evt.prop, []);
    eventMap.get(evt.prop).push(evt);
  });

  const antdImports = ['Form'];
  if (hasQuery) antdImports.push('Button');
  antdImports.push('message');
  if (isModal) antdImports.push('Modal');
  if (fdefs.some((f) => f.type === 'Input' || !f.type)) antdImports.push('Input');
  if (fdefs.some((f) => f.type === 'Select')) antdImports.push('Select');
  if (fdefs.some((f) => f.type === 'DatePicker')) antdImports.push('DatePicker');
  if (fdefs.some((f) => f.type === 'InputNumber')) antdImports.push('InputNumber');

  const hasDatePicker = fdefs.some((f) => f.type === 'DatePicker');
  const uniqueAntd = [...new Set(antdImports)].sort();

  const listFieldExpr = resolveListField(rc);

  // Header: imports (only in standalone mode)
  let code = '';
  if (!inline) {
    code += `import React, { useState, useEffect } from 'react';
import { ${uniqueAntd.join(', ')} } from 'antd';
${rc.importStatement}
${hasDatePicker ? "import dayjs from 'dayjs';" : ''}
${dictFields.length > 0 ? dc.importStatement || "import DataDict from '@/utils/DataDict';" : ''}

`;
  }

  // Component declaration
  code += `const ${name} = (props) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);`;

  // Dict state declarations（须在 formItems 之前：动态 Select 的 options 引用 <name>_options 变量）
  if (dictFields.length > 0) {
    code += `
${generateDictState(dictFields)}`;
  }

  // formItems 配置常量（引用上面的字典状态变量，须在状态声明之后）
  if (formItemsCode) {
    code += `
${formItemsCode}`;
  }

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

  // Load effect
  if (hasLoad) {
    const loadCall = buildRequestCall(rc, 'load', comp.url.load);
    code += `

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await ${loadCall};
        // 处理加载数据 (如下拉选项等)
      } catch (error) {
        message.error('加载数据失败');
      }
    };
    fetchData();
  }, []);`;
  }

  // Dict loading effects
  if (dictFields.length > 0) {
    code += generateDictEffects(dictFields, dc);
  }

  // Form数据回显
  if (hasIncoming) {
    const dateFields = fdefs.filter((f) => f.type === 'DatePicker');
    let dateConversion = '';
    if (dateFields.length > 0) {
      dateConversion = dateFields.map((f) => `
      if (typeof normalized['${f.name}'] === 'string') {
        normalized['${f.name}'] = dayjs(normalized['${f.name}']);
      }`).join('');
    }

    code += `

  useEffect(() => {
    if (props.value && typeof props.value === 'object' && Object.keys(props.value).length > 0) {
      const normalized = { ...props.value };${dateConversion}
      form.setFieldsValue(normalized);
    }
  }, [props.value]);`;
  }

  // Query handler
  if (hasQuery) {
    const queryCall = buildRequestCall(rc, 'query', comp.url.query);
    const setValueProps = Object.entries(comp.setValueAliases || {});
    let querySetValueCode;
    if (setValueProps.length === 0) {
      querySetValueCode = '';
    } else if (setValueProps.length === 1) {
      querySetValueCode = `
      if (props.setValue) {
        props.setValue(res['${listFieldExpr}'] || []);
      }`;
    } else {
      querySetValueCode = setValueProps.map(([target, alias]) =>
        `      if (props.${alias}) {
        props.${alias}(res['${listFieldExpr}'] || []);
      }`
      ).join('\n');
    }

    code += `

  const handleQuery = async (values) => {
    setLoading(true);
    try {
      const res = await ${queryCall};${querySetValueCode}
    } catch (error) {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };`;
  }

  // Save handler
  if (hasSave) {
    const saveCall = buildRequestCall(rc, 'save', comp.url.save);
    const setValueProps = Object.entries(comp.setValueAliases || {});
    let saveSetValueCode;
    if (setValueProps.length === 0) {
      saveSetValueCode = '';
    } else if (setValueProps.length === 1) {
      saveSetValueCode = `
      if (props.setValue) {
        props.setValue(values);
      }`;
    } else {
      saveSetValueCode = setValueProps.map(([target, alias]) =>
        `      if (props.${alias}) {
        props.${alias}(values);
      }`
      ).join('\n');
    }

    code += `

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const res = await ${saveCall};
      message.success('保存成功');${saveSetValueCode}`;

    // Modal auto-close on save
    if (isModal) {
      code += `
      if (setOpen) setOpen(false);`;
    }

    code += `
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
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

  // onFinish handler
  if (hasQuery || hasSave) {
    if (hasQuery) {
      code += `

  const handleFinish = (values) => {
    handleQuery(values);
  };
  const handleReset = () => {
    form.resetFields();
    handleQuery({});
  };`;
    } else if (hasSave) {
      code += `

  const handleFinish = (values) => {
    handleSave(values);
  };`;
    }
  }

  const hasOnFinish = hasQuery || (hasSave && !hasQuery);

  // Render: Modal mode
  if (isModal) {
    const modalTitle = fdefs.length > 0 ? fdefs[0].label : name;

    code += `

  return (
    <Modal
      title="${modalTitle}"
      open={open}
      onCancel={() => setOpen ? setOpen(false) : null}
      onOk={() => handleFinish ? form.submit() : null}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical"${hasOnFinish ? ' onFinish={handleFinish}' : ''}>
        ${fieldsRenderCode}
      </Form>
    </Modal>
  );
};`;
  } else {
    // Normal mode
    code += `

  return (
    <div>
      <Form form={form} layout="inline"${hasOnFinish ? ' onFinish={handleFinish}' : ''}>
        ${fieldsRenderCode}
        ${hasQuery ? `
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            查询
          </Button>
          <Button onClick={handleReset} style={{ marginLeft: 8 }}>
            重置
          </Button>
        </Form.Item>` : ''}
        ${hasSave ? `
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存
          </Button>
        </Form.Item>` : ''}
      </Form>
    </div>
  );
};`;
  }

  // Export (only in standalone mode)
  if (!inline) {
    code += `

export default ${name};
`;
  }

  return { code };
}

module.exports = { generate };
