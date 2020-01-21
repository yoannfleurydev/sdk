const isYAMLValid = require('../isYAMLValid');

test('valid yaml', () => {
  expect(isYAMLValid('valid: yaml')).toBe(true);
});

test('invalid yaml', () => {
  expect(isYAMLValid(
    `
      nonvalid:
      - yaml-ifd-fun:
        -yaml
        -d
    `,
  )).toBe(false);
});
