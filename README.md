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
    # Recommended: grant the job the permissions needed to post comments or update releases
    permissions:
      contents: write
      issues: write
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
          # Optional: override the token used to post comments/issues/releases.
          # Defaults to the automatically provided GITHUB_TOKEN when omitted.
          github-token: ${{ github.token }}
```

## Permissions and tokens

- **Prefer granting job permissions**: If the workflow runs in-repo, add a `permissions` block to the job to allow write operations (shown above).
- **Forked PRs limitation**: Workflows triggered from forks do not have access to secrets and receive limited permissions; write operations (comments/releases) will fail in that context.
- **Use a PAT when needed**: To guarantee write access (or to operate across repos), create a Personal Access Token with the minimal scopes you need (for release/commenting `repo` or `public_repo`) and pass it via the `github-token` input as a repository secret.

Example with a PAT (stored as `PERSONAL_GITHUB_TOKEN`):

```yaml
- name: Coswarm Deploy
  uses: kintsdev/coswarm-deploy@latest
  with:
    base-url: ${{ secrets.COSWARM_API_URL }}
    token: ${{ secrets.COSWARM_DEPLOY_TOKEN }}
    image: redis:alpine
    github-token: ${{ secrets.PERSONAL_GITHUB_TOKEN }}
```
