/**
 * 数据字典辅助函数
 *
 * 为使用了 dictName 的 Select 字段生成状态声明和加载代码。
 */

/**
 * 生成字典选项的状态声明代码
 * @param {Array} dictFields - 使用了 dictName 的字段数组
 * @returns {string} 如 "const [DEPT_options, setDEPT_options] = useState([]);\n..."
 */
function generateDictState(dictFields) {
  return dictFields
    .map((f) => `  const [${f.name}_options, set${f.name}_options] = useState([]);`)
    .join('\n');
}

/**
 * 生成字典加载 useEffect 代码
 *
 * 如果 labelField/valueField 与默认值不同，会生成 map 转换。
 *
 * @param {Array} dictFields - 使用了 dictName 的字段数组
 * @param {object} dictConfig - 字典配置 { method, labelField, valueField }
 * @returns {string}
 */
function generateDictEffects(dictFields, dictConfig) {
  const dc = dictConfig || {};
  const methodTmpl = dc.method || "DataDict.getDict('{{dictName}}')";
  const labelField = dc.labelField || 'label';
  const valueField = dc.valueField || 'value';

  return dictFields
    .map((f) => {
      const call = methodTmpl.replace(/\{\{dictName\}\}/g, f.dictName);

      // 如果字段名就是 label/value，直接赋值；否则需要 map
      let setOptionsCode;
      if (labelField === 'label' && valueField === 'value') {
        setOptionsCode = `set${f.name}_options(res || []);`;
      } else {
        setOptionsCode =
          `set${f.name}_options((res || []).map(item => ({ label: item['${labelField}'], value: item['${valueField}'] })));`;
      }

      return `
  useEffect(() => {
    const loadDict = async () => {
      try {
        const res = await ${call};
        ${setOptionsCode}
      } catch (error) {
        console.warn('字典 ${f.dictName} 加载失败', error);
        set${f.name}_options([]);
      }
    };
    loadDict();
  }, []);`;
    })
    .join('');
}

module.exports = { generateDictState, generateDictEffects };
