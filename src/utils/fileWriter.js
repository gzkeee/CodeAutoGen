const fs = require('fs-extra');
const prettier = require('prettier');
const path = require('path');

async function formatCode(code) {
  try {
    return await prettier.format(code, {
      parser: 'babel',
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 100,
    });
  } catch {
    return code;
  }
}

async function writeFiles(outputPath, output) {
  const resolvedPath = path.resolve(outputPath);

  fs.ensureDirSync(resolvedPath);
  fs.ensureDirSync(path.join(resolvedPath, 'components'));

  const indexContent = await formatCode(output.index);
  fs.writeFileSync(path.join(resolvedPath, 'index.jsx'), indexContent, 'utf-8');
  console.log(`  ✓ 已生成: index.jsx`);

  for (const comp of output.components) {
    const formatted = await formatCode(comp.code);
    const compPath = path.join(resolvedPath, 'components', `${comp.name}.jsx`);
    fs.writeFileSync(compPath, formatted, 'utf-8');
    console.log(`  ✓ 已生成: components/${comp.name}.jsx`);
  }
}

module.exports = { writeFiles, formatCode };
