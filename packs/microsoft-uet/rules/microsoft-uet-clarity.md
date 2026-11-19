---
description: Microsoft UET and Microsoft Clarity on the same site.
globs: ["**/*analytics*.ts", "**/*uet*.ts", "**/*clarity*.ts"]
with: ["microsoft-clarity"]
---

# Microsoft UET With Clarity

- Clarity data comes from one source. When Clarity is installed on its own, "Enable Microsoft Clarity" stays off in the UET tag settings in Microsoft Advertising.
- Clarity sits in the `analytics` category and UET in `marketing`. UET consent mode does not cover Clarity: Clarity gets its own consent call.
