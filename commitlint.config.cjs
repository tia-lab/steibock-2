module.exports = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[(\d+)\]\s(\w*)(?:\((.*)\))?!?:\s(.*)$/,
      headerCorrespondence: ["commitNumber", "type", "scope", "subject"],
    },
  },
  rules: {
    "body-max-line-length": [2, "always", 1500],
    "header-max-length": [2, "always", 300],
    "subject-case": [0],
  },
};
