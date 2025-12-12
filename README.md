# Coswarm Deploy GitHub Action

This action sends a deployment request to the Coswarm API. It replicates the manual `curl` call:

```
curl -L 'http://localhost:3000/api/v1/apps/deploy' \
  -H 'Content-Type: application/json' \
  -d '{"token":"app_29fd8aa20b9d48506fe243ec925dec74","image":"redis:alpine"}'
```

## Inputs

| Name | Required | Description |
| ---- | -------- | ----------- |
| `token` | Yes | Deployment token. Store this in a secret such as `COSWARM_DEPLOY_TOKEN`. |
| `image` | Yes | Container image reference, e.g. `redis:alpine`. |
| `base-url` | Yes | Coswarm API base URL. |

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
```
