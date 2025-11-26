/**
 * @type {import('prettier').Config}
 */
module.exports = {
  bracketSpacing: true,
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  singleAttributePerLine: true,
  htmlWhitespaceSensitivity: 'strict',
  endOfLine: 'lf',
  importOrder: ['^[a-z]*/(.*)$', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
};
