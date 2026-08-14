#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { parseConfig } = require('../src/core/parser');
const { buildModel } = require('../src/core/modelBuilder');
const { render } = require('../src/core/renderer');
const { writeFiles } = require('../src/utils/fileWriter');
const defaults = require('../src/config/defaults');
const userRequestConfig = require('../src/config/request');
const userDictConfig = require('../src/config/dict');
const logger = require('../src/utils/logger');

program
  .option('-c, --config <path>', 'JSON 配置文件路径')
  .option('-o, --output <path>', '代码输出目录')
  .option('-n, --page-name <name>', '页面名称', 'Page')
  .parse(process.argv);

async function main() {
  const options = program.opts();

  logger.info('╔══════════════════════════════════════╗');
  logger.info('║  前端代码生成工具 V7.1               ║');
  logger.info('╚══════════════════════════════════════╝');
  logger.divider();

  if (!options.config) {
    logger.error('错误: 请指定配置文件路径 (-c, --config)');
    logger.gray('');
    logger.gray('用法:');
    logger.gray('  gen-ui -c <配置文件> -o <输出目录> [-n <页面名称>]');
    logger.gray('示例:');
    logger.gray('  gen-ui -c ./page-config.json -o ./src/pages/ProcessManage -n ProcessManage');
    process.exit(1);
  }

  if (!options.output) {
    logger.error('错误: 请指定输出目录路径 (-o, --output)');
    process.exit(1);
  }

  // 合并请求配置：用户配置覆盖默认配置
  const requestConfig = {
    ...defaults.request,
    ...userRequestConfig,
    methods: {
      ...defaults.request.methods,
      ...(userRequestConfig.methods || {}),
    },
  };

  // 合并数据字典配置：用户配置覆盖默认配置
  const dictConfig = {
    ...defaults.dict,
    ...userDictConfig,
  };

  logger.info('开始生成代码...\n');

  try {
    // 1. 解析配置
    logger.gray('📋 解析配置文件...');
    const { componentMap, links } = parseConfig(options.config);
    logger.success(`发现 ${Object.keys(componentMap).length} 个组件，${links.length} 条数据流`);

    // 2. 构建模型
    logger.gray('🏗  构建组件拓扑...');
    const model = buildModel(componentMap, links);
    logger.success('拓扑构建完成');

    // Print topology
    Object.entries(model).forEach(([id, comp]) => {
      const outStr = comp.outgoing.map(o => `${o.target}(${o.behavior})`).join(', ');
      const inStr = comp.incoming.join(', ');
      const modalInfo = comp.layout === 'Modal' ? ` [Modal:${comp.modalRole || 'unknown'}]` : '';
      logger.gray(`     ${id} [${comp.type}]${modalInfo}`);
      if (inStr) logger.gray(`       入度 ← ${inStr}`);
      if (outStr) logger.gray(`       出度 → ${outStr}`);
    });

    // 3. 渲染代码
    logger.gray('\n🎨 生成代码...');
    const output = render(model, options.pageName, requestConfig, dictConfig);

    // 4. 写入文件
    logger.gray('💾 写入文件...\n');
    const outputPath = path.resolve(options.output);

    await writeFiles(outputPath, output);

    logger.divider();
    logger.success('代码生成完成!');
    logger.gray(`   输出路径: ${outputPath}`);
  } catch (error) {
    logger.error(`生成失败: ${error.message}`);
    logger.gray(error.stack);
    process.exit(1);
  }
}

main();
