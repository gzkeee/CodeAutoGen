/**
 * 事件绑定器
 * 根据组件的出站链接（outgoing）生成结构化事件描述。
 * 每个事件包含：
 *   - prop: 事件属性名 (如 'onFinish', 'onRow', 'onValuesChange')
 *   - type: 事件类型标识
 *   - data: 结构化的绑定数据，供模板直接使用
 */

function bindEvents(comp) {
  const events = [];

  comp.outgoing.forEach((out) => {
    const behavior = out.behavior;
    const alias = comp.setValueAliases[out.target];

    switch (behavior) {
      case 'formToTable':
        events.push({
          prop: 'onFinish',
          type: 'formToTable',
          data: {
            alias,
          },
        });
        break;

      case 'toOut':
        // OUT 虚拟节点：将数据输出到容器父级，通过 onRow 触发
        events.push({
          prop: 'onRow',
          type: 'toOut',
          data: {
            alias,
            target: 'OUT',
          },
        });
        break;

      case 'tableToForm':
        events.push({
          prop: 'onRow',
          type: 'tableToForm',
          data: {
            alias,
            target: out.target,
          },
        });
        break;

      case 'tableToTable':
        events.push({
          prop: 'onRow',
          type: 'tableToTable',
          data: {
            alias,
            target: out.target,
          },
        });
        break;

      case 'formToForm':
        events.push({
          prop: 'onValuesChange',
          type: 'formToForm',
          data: {
            selectField: comp.selectField,
            alias,
          },
        });
        break;

      case 'formToContainer':
        // Form→Container：onFinish 触发查询，数据传入容器
        events.push({
          prop: 'onFinish',
          type: 'formToContainer',
          data: { alias },
        });
        break;

      case 'tableToContainer':
        // Table→Container：行点击将 record 传入容器
        events.push({
          prop: 'onRow',
          type: 'tableToContainer',
          data: { alias, target: out.target },
        });
        break;
    }
  });

  return events;
}

module.exports = { bindEvents };
