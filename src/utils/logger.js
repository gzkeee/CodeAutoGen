const chalk = require('chalk');

const logger = {
  info: (msg) => console.log(chalk.blue(msg)),
  success: (msg) => console.log(chalk.green(`✔ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
  error: (msg) => console.log(chalk.red(`✖ ${msg}`)),
  gray: (msg) => console.log(chalk.gray(msg)),
  section: (msg) => console.log(chalk.cyan(`\n═══ ${msg} ═══`)),
  divider: () => console.log(chalk.gray('─'.repeat(40))),
};

module.exports = logger;
