---
description: Zod schemas shared by form clients and servers.
globs: ["**/*.tsx", "**/*.jsx", "**/*form*.ts", "**/*action*.ts", "**/*schema*.ts", "**/*contact*.ts"]
with: ["zod"]
---

# Web Forms With Zod

- Each form has one Zod schema in a module that both client and server import. The schema module never imports server-only code.
- The server parses `FormData` with `safeParse` after converting it with `Object.fromEntries`, or with a form-data helper for repeated fields and files.
- Fields arrive as strings. Use `z.coerce` for numbers and dates, and treat an empty string as missing for optional fields.
- Field errors come from `z.flattenError(error).fieldErrors` and are returned with the submitted values.
- Error messages in the schema are user-facing text, translated when the site has several languages.
- Server-only checks (unique email, rate limits, challenge tokens) run after schema parsing and add their errors to the same field error shape.
- Client validation uses the same schema through the form library's Zod adapter or Standard Schema support.
