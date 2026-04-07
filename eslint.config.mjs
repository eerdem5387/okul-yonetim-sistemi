import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Eski Node yardımcıları (require); Next derlemesine dahil değil
      "scripts/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // any kullanımını warning'e düşür
      "@typescript-eslint/no-unused-vars": "warn", // Unused vars warning
      "react/no-unescaped-entities": "warn", // Escaped entities warning
      "react-hooks/exhaustive-deps": "warn", // useEffect deps warning
      // Dinamik / kullanıcı URL'li görsellerde next/image domain yapılandırması gerekir
      "@next/next/no-img-element": "warn",
    },
  },
  {
    files: [
      "src/components/faaliyet-ekle/**/*.tsx",
      "src/components/faaliyet-yonetimi/**/*.tsx",
      "src/components/ib-faaliyet-dashboard/**/*.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
