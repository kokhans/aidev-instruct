---
name: web-release
description: Release checklist for websites. Lists the verification steps before a release (crawlers, share previews, crawl files, headers, keyboard and zoom, consent, forms and email, structured data, Core Web Vitals) and the steps after launch (Search Console, Bing Webmaster Tools, sitemaps, monitoring). Use before a production release, after a domain or routing change, or when the web-auditor agent leaves manual checks.
---

# Web Release

Run the `web-auditor` agent first against a preview deployment. Then work through the steps it could not run. Skip steps for concerns the project does not have.

## Before Release

1. Fetch each page type as `LinkedInBot/1.0` and `facebookexternalhit/1.1`. Every metadata tag is present and every URL is absolute HTTPS on the canonical host.
2. Open every `og:image` URL: status 200, `image/png` or `image/jpeg`, 1200 x 630.
3. Check `/robots.txt`, `/sitemap.xml`, the RSS feed, an unknown route (status 404) and the redirects from `http`, the other host variant and the other trailing-slash form.
4. Check the preview deployment sends `noindex` and the production build does not.
5. Read the response headers of HTML, a hashed asset and the 404 page. The CSP is enforced, not report-only, and the console shows no violations on any page type.
6. Go through each page type with the keyboard only, at 200% zoom and at 320 px width. Run an axe scan on each.
7. Consent: with cleared site data, no analytics or ad cookies exist before a choice. Accepting sets them, rejecting or withdrawing clears them, and the footer control reopens preferences.
8. Submit every form once with valid data and once with errors. The email arrives with SPF, DKIM and DMARC passing, and a retried submission does not send twice.
9. Validate structured data with Google Rich Results Test.
10. Run LinkedIn Post Inspector and the Facebook Sharing Debugger on the home page and one post. Re-scrape after every metadata change, because both cache previews for days.
11. Run Lighthouse or PageSpeed Insights on the home page and the heaviest page type on mobile. Fix any LCP over 2.5 s, CLS over 0.1 or long tasks during load.
12. Legal pages are linked in the footer of every page, list every tool and cookie, and show a current last-updated date.

## After Launch

1. Verify the domain in Google Search Console and Bing Webmaster Tools. A DNS verification covers every host and protocol.
2. Submit the sitemap in both. Bing Webmaster Tools can import the Search Console setup.
3. Confirm IndexNow pings arrive when content is published.
4. After the first crawl, review the indexing report, fix pages excluded by mistake, and check the canonical Google chose.
5. After 28 days, review the Core Web Vitals report on real visits and fix the URL groups it flags.
6. Check analytics and ad tools receive data only after consent, and that page views are not doubled on client navigation.
