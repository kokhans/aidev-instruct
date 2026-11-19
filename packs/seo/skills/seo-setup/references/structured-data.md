# Structured Data

JSON-LD in a `<script type="application/ld+json">` in the initial HTML. One helper builds it next to the metadata helper.

## Types per Page

| Page | Types |
| --- | --- |
| Home | `Organization` (name, logo, url, `sameAs` profiles) and `WebSite` |
| Post or article | `Article` or `BlogPosting` (headline, image, author, `datePublished`, `dateModified`) |
| Nested page | `BreadcrumbList` matching the visible breadcrumb |
| Product | `Product` with `offers`, only when price and availability are shown |
| Event, job, recipe, video | The matching type, only when the page is that thing |

## Rules

- Markup describes only what the visible page shows. Hidden or invented content breaks Google's guidelines.
- Every URL inside is absolute.
- `@id` values connect entities across pages: the `Organization` on every page uses the same `@id`.
- Values inside JSON-LD are serialized with `JSON.stringify` and `<` escaped as `\u003c`, so CMS text cannot close the script tag.
- Validate with Google Rich Results Test and the Schema Markup Validator after every type change.

## Articles and Authors

- Every post has a byline that links to an author page with name, role, photo and profile links.
- `author` in JSON-LD is a `Person` with `name` and `url` pointing to that author page.
- Publish and update dates are visible on the page and match `datePublished` and `dateModified`.
- `dateModified` changes only for real content edits, never for a redeploy.
