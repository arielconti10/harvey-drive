const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      ".history/**",
      "eslint.config.cjs",
      "next-env.d.ts",
      "public/pdf.worker.min.mjs",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

module.exports = config;
