---
description: Building, caching, signing and pushing container images in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["docker"]
---

# GitHub Actions for Docker

- Images build with `docker/setup-buildx-action` and `docker/build-push-action`. Tags and labels come from `docker/metadata-action`.
- Layer caching uses `cache-from: type=gha` and `cache-to: type=gha,mode=max`.
- Registry login uses `docker/login-action`. GitHub Container Registry uses `GITHUB_TOKEN` with `packages: write` on the publishing job only. Cloud registries use OIDC.
- Pull requests build without pushing. Pushes happen on the default branch or on release tags.
- Published images set `provenance: mode=max` and `sbom: true`. Private repositories get only `mode=min` provenance by default, and SBOMs are never added by default.
- Attestations need a direct push to a registry. `load: true` drops them.
- Build secrets go through `secrets:` and secret mounts, never build args, because max provenance records build arg values.
- Images are tagged with the commit SHA and the release version, never only `latest`. Deployments reference the digest.
