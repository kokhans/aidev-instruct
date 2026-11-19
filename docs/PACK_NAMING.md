# Pack Naming

How packs, stacks and their items are named. Apply the steps in order: the first that matches decides the name.

## Packs

| Step | Case | Name | Examples |
| --- | --- | --- | --- |
| 1 | A language, runtime, platform, database, tool or service | The name developers use, lowercase kebab-case | `go`, `rust`, `csharp`, `dotnet`, `bun`, `postgresql`, `docker`, `stripe`, `nextjs`, `tailwind` |
| 2 | A mode or database variant of another pack | `<pack>-<variant>`, with the exact name of the pack it varies | `nextjs-spa`, `react-router-ssr`, `drizzle-postgresql` |
| 3 | A member of a product family, or an add-on that exists only for one framework | `<family or framework>-<name>` | `tanstack-query`, `tanstack-start`, `aspnetcore-openapi`, `dotnet-oss` |
| 4 | A cloud's managed version of another pack | `<cloud>-<pack>` | `azure-signalr` |
| 5 | A library or framework for one language, whose name is unique | Its own name | `zod`, `elysia`, `fastapi`, `axum`, `gqlgen`, `sqlc` |
| 6 | The same, but the name is ambiguous | `<language pack>-<name>` | `go-echo`, `rust-sqlx` |
| 7 | A concern that spans technologies | The plain name when it clearly means the web, `web-<concern>` when the word also fits backends or native apps | `seo`, `accessibility`, `responsive`, `web-security`, `web-performance`, `web-forms` |

### When a Language Prefix Is Needed

A language prefix is for telling two things apart, never for grouping. `tags` carry what a pack covers, and search covers names, descriptions and tags.

A name is ambiguous when one of these is true:

- Another pack has, or will likely need, the same name.
- A well-known library in another language has the same name. Check npm, PyPI, crates.io, NuGet, pkg.go.dev and Packagist.

| Library | Ambiguous | Pack |
| --- | --- | --- |
| Echo (Go) | Yes: Laravel Echo in JavaScript and PHP | `go-echo` |
| SQLx (Rust) | Yes: `sqlx` in Go | `rust-sqlx` |
| Axum (Rust) | No | `axum` |
| gqlgen (Go) | No | `gqlgen` |
| sqlc (Go) | No | `sqlc` |
| FastAPI (Python) | No | `fastapi` |

### Services With SDKs in Many Languages

A service pack, such as `stripe`, `clerk`, `resend` or `supabase`, keeps the service's name, even while its guidance covers one SDK.

- Guidance that holds in every language, such as webhooks, idempotency and key handling, stays in the pack.
- When a second language is added, each language's SDK guidance moves into an integration item `<service>-<language pack>` with `with`, such as `stripe-python` with `with: ["python"]`. The pack then stops requiring `typescript`.
- Never create a second pack such as `python-stripe`.

### Spelling

| Product name | Pack | Rule |
| --- | --- | --- |
| Next.js | `nextjs` | Drop dots |
| ASP.NET Core, Entity Framework Core | `aspnetcore`, `efcore` | Use the short name the vendor uses in package names |
| .NET | `dotnet` | Spell out symbols |
| shadcn/ui, Radix UI | `shadcn-ui`, `radix-ui` | A slash or a space becomes a hyphen |
| MikroORM, Better Auth | `mikro-orm`, `better-auth` | Follow the npm package name when it is kebab-case |
| Tailwind CSS | `tailwind` | Drop a suffix developers leave out when they speak |
| Google Analytics | `google-analytics` | Keep a vendor that is part of the product name |

## Rules That Always Apply

- Lowercase letters, digits and hyphens only.
- Never put a version in a pack name. A versioned item names one: `csharp-15`, `csharp-7-3`.
- A pack whose name starts with `<other pack>-` requires that pack, directly or through another pack: `go-echo` requires `go`, `react-router-spa` requires `react-router`.
- A pack whose name ends with `-<other pack>` requires that pack: `drizzle-postgresql` requires `postgresql`, `azure-signalr` requires `signalr`.
- A part that names another pack uses that pack's exact name: `drizzle-postgresql`, not `drizzle-postgres`.
- A private feed puts its name first: `acme-api`, `acme-react`.

## Items

| Item | Name | Examples |
| --- | --- | --- |
| Main rule of a pack | The pack's name | `rules/zod.md` in `zod` |
| Other rules and skills | `<pack>-<topic>`. A mode pack uses its base pack's name. A topic with its own well-known name keeps it. | `react-forms`, `nextjs-security` in `nextjs-ssr`, `rtk-query`, `web-vitals` |
| Integration item | `<pack>-<other pack>`. Drop the other pack's language or family prefix when the first part already implies it. | `better-auth-drizzle`, `nextjs-seo`, `tanstack-query-start`, `gqlgen-echo`, `axum-sqlx` |
| Versioned item | `<pack>-<version>`, dots as hyphens | `csharp-15`, `csharp-7-3` |
| Agent | A role noun | `code-reviewer`, `web-auditor` |

Rule, skill and agent names are unique across all packs, because they share one folder in a project.

## Stacks

| Case | Name | Examples |
| --- | --- | --- |
| Built around one main pack | `<main pack>-<kind>`, where kind is `api`, `spa`, `ssr` or `site` | `aspnetcore-api`, `elysia-api`, `go-echo-api`, `axum-api`, `nextjs-ssr` |
| The main pack name already ends with the kind | The main pack's name | `nextjs-spa`, `react-router-ssr`, `tanstack-start-spa` |
| A cross-cutting set | The purpose | `public-site` |

A stack may share its name with a pack, as `nextjs-spa` does.

## Renamed Packs

Nothing is published yet, so an old name needs no mapping in the CLI.

| Current | New | Step |
| --- | --- | --- |
| `go-gqlgen` | `gqlgen` | 5: the name is unique |
| `go-sqlc` | `sqlc` | 5: the name is unique |
| `rust-axum` | `axum` | 5: the name is unique |
| `drizzle-postgres` | `drizzle-postgresql` | 2: the exact name of `postgresql` |
| `efcore-postgres` | `efcore-postgresql` | 2: the exact name of `postgresql` |
| Stack `go-api` | `go-echo-api` | Stacks: the main pack is `go-echo` |
| Stack `rust-api` | `axum-api` | Stacks: the main pack is `axum` |

Their items follow the new names:

| Current item | New item |
| --- | --- |
| `go-gqlgen`, `go-gqlgen-echo` | `gqlgen`, `gqlgen-echo` |
| `go-sqlc`, `go-sqlc-postgresql` | `sqlc`, `sqlc-postgresql` |
| `rust-axum`, `rust-axum-sqlx` | `axum`, `axum-sqlx` |
| `drizzle-postgres` | `drizzle-postgresql` |
| `efcore-postgres`, `efcore-postgres-features` | `efcore-postgresql`, `efcore-postgresql-features` |
| `aspire-efcore-postgres` in `aspire` | `aspire-efcore-postgresql` |
| `aspnetcore-efcore-postgres` in `aspnetcore` | `aspnetcore-efcore-postgresql` |

Every other pack, stack and item already follows this document.
