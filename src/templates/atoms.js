/**
 * 原子字段模板 - 渲染 Form.Item 及其内部控件
 *
 * Form 表单项的元信息（name/label/rules 等 antd Form.Item 标准属性）与
 * 控件属性（placeholder/options/disabled）全部提取为 formItems 配置常量，
 * 以键值对形式组织（key=字段 name，value=该字段完整属性），UI 组件通过
 * {...formItems.KEY} 展开到 <Form.Item>；
 * 控件类型（Input/Select/DatePicker/InputNumber）按最初 JSON 配置硬编码在
 * JSX 中，控件属性通过 formItems.KEY.xxx 显式引用，便于人工直接修改。
 * Table 列仍以数组字面量生成（renderTableColumn）。
 */

// 将字符串包装为单引号 JS 字符串（转义反斜杠与单引号）
function q(str) {
  return `'${String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// 控件类型（无 type 时默认 Input）
function resolveControlType(field) {
  return field.type || 'Input';
}

// 占位符派生：Input 用"请输入"，其余用"请选择"
function resolvePlaceholder(field) {
  const control = resolveControlType(field);
  return control === 'Input' ? `请输入${field.label}` : `请选择${field.label}`;
}

// 字段 name 是否为合法 JS 标识符（决定对象 key / 引用写法）
function isIdentifier(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

// 对象 key 写法：合法标识符用裸名，否则加引号
function keyExpr(name) {
  return isIdentifier(name) ? name : q(name);
}

// 引用写法：formItems.NAME 或 formItems['NAME']
function refExpr(name) {
  return isIdentifier(name) ? `.${name}` : `[${q(name)}]`;
}

/**
 * 生成 formItems 配置常量（插入组件函数体）
 *
 * 键值对形式：key=字段 name，value=该字段完整属性。
 * 包含 antd Form.Item 标准属性（name / label / rules）与控件属性
 * （placeholder / options / disabled），供 <Form.Item {...formItems.KEY}>
 * 展开及控件显式引用。
 *
 * @param {Array} fields - 组件字段定义
 * @returns {string} 函数体代码片段
 */
function generateFormItemsConfig(fields) {
  if (!fields || fields.length === 0) return '';

  const lines = fields
    .map((f) => {
      const control = resolveControlType(f);
      let props = `    ${keyExpr(f.name)}: {
      name: ${q(f.name)},
      label: ${q(f.label)},
      placeholder: ${q(f.placeholder || resolvePlaceholder(f))},`;

      if (f.disabled) {
        props += `
      disabled: true,`;
      }

      if (control === 'Select') {
        const isDynamic =
          f.dictName && (!f.options || f.options.length === 0);
        if (isDynamic) {
          // 动态字典：options 引用字典加载状态变量（<name>_options）
          props += `
      options: ${f.name}_options,`;
        } else if (f.options && f.options.length > 0) {
          const opts = f.options
            .map((o) => `        { value: ${q(o.value)}, label: ${q(o.label)} }`)
            .join(',\n');
          props += `
      options: [
${opts},
      ],`;
        }
      }

      if (f.rules) {
        props += `
      rules: ${JSON.stringify(f.rules)},`;
      }

      props += `
    },`;
      return props;
    })
    .join('\n');

  return `  // 表单项配置：由 JSON 配置生成，键值对 key=字段 name，value=该字段完整属性
  // （含 Form.Item 属性与控件属性 placeholder/options/disabled），人工维护字段时请修改此处
  const formItems = {
${lines}
  };`;
}

/**
 * 生成单个表单项的 JSX：<Form.Item {...formItems.KEY}> + 硬编码控件
 *
 * 控件类型按最初配置硬编码，不做动态分发；控件属性通过
 * formItems.KEY.placeholder / .options / .disabled 显式引用，
 * 方便人工直接修改某个表单项。
 *
 * @param {object} field - 字段定义
 * @returns {string} JSX 片段
 */
function renderFieldItemJsx(field) {
  const control = resolveControlType(field);
  const ref = refExpr(field.name);
  const disabledAttr = field.disabled ? ` disabled={formItems${ref}.disabled}` : '';

  let controlJsx;
  if (control === 'Select') {
    controlJsx = `<Select placeholder={formItems${ref}.placeholder} options={formItems${ref}.options}${disabledAttr} />`;
  } else if (control === 'DatePicker') {
    controlJsx = `<DatePicker placeholder={formItems${ref}.placeholder}${disabledAttr} />`;
  } else if (control === 'InputNumber') {
    controlJsx = `<InputNumber placeholder={formItems${ref}.placeholder}${disabledAttr} style={{ width: '100%' }} />`;
  } else {
    // Input 及默认降级
    controlJsx = `<Input placeholder={formItems${ref}.placeholder}${disabledAttr} />`;
  }

  return `        <Form.Item {...formItems${ref}}>
          ${controlJsx}
        </Form.Item>`;
}

/**
 * 生成 Form 内渲染全部表单项的 JSX（每个表单项独立生成，控件类型硬编码）
 *
 * @param {Array} fields - 组件字段定义
 * @returns {string} JSX 片段
 */
function generateFormFieldRender(fields) {
  if (!fields || fields.length === 0) return '';
  return fields.map((f) => renderFieldItemJsx(f)).join('\n\n');
}

/**
 * 生成 Table 列定义（保持不变）
 */
function renderTableColumn(field) {
  return `          {
            title: '${field.label}',
            dataIndex: '${field.name}',
            key: '${field.name}',
          }`;
}

module.exports = { generateFormItemsConfig, generateFormFieldRender, renderTableColumn };
