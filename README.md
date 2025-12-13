# Coswarm Deploy GitHub Action

This Node.js action sends a deployment request to the Coswarm API without relying on local `curl` tooling. On failure, it can automatically create a GitHub issue (using `@actions/core` and `@actions/github`) to alert maintainers—just provide a token with permission to create issues.

## Inputs

| Name | Required | Description |
| ---- | -------- | ----------- |
| `token` | Yes | Deployment token. Store this in a secret such as `COSWARM_DEPLOY_TOKEN`. |
| `image` | Yes | Container image reference, e.g. `redis:alpine`. |
| `base-url` | Yes | Coswarm API base URL, e.g. `https://api.coswarm.com`. |
| `github-token` | No | Token with permission to open issues. Defaults to the `GITHUB_TOKEN` environment variable when omitted. |

## Outputs

| Name | Description |
| ---- | ----------- |
| `response` | Raw response body returned by the Coswarm API. |

## Example workflow

```yaml
name: Coswarm Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Go
        uses: actions/setup-go@v6
        with:
          go-version: "^1.25"

      - name: Coswarm Deploy
        uses: kintsdev/coswarm-deploy@latest
        with:
          base-url: ${{ secrets.COSWARM_API_URL }}
          token: ${{ secrets.COSWARM_DEPLOY_TOKEN }}
          image: redis:alpine
          github-token: ${{ github.token }}
```
