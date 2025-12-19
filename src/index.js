const core = require('@actions/core');
const github = require('@actions/github');

function resolveApiUrl(baseUrl) {
  if (!baseUrl) {
    throw new Error('inputs.base-url must be provided.');
  }
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/api/v1/apps/deploy`;
}

async function triggerDeploy(apiUrl, token, image) {
  const payload = JSON.stringify({ token, image });
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  const bodyText = await response.text();
  if (!response.ok) {
    const error = new Error(
      `Deploy failed with status ${response.status}: ${response.statusText}`,
    );
    error.responseBody = bodyText;
    throw error;
  }
  return bodyText;
}

async function openFailureIssue(githubToken, context, details) {
  if (!githubToken) {
    core.warning('No GitHub token available to create a failure issue.');
    return;
  }
  const octokit = github.getOctokit(githubToken);
  const { owner, repo } = context.repo;
  const responseSection = details.error.responseBody
    ? [
        '<details>',
        '<summary>Response body</summary>',
        '',
        '```',
        details.error.responseBody,
        '```',
        '</details>',
      ].join('\n')
    : '';
  const title = `Coswarm deploy failed for ${details.image}`;
  const body = [
    'The Coswarm deployment API call failed.',
    '',
    `**API URL:** ${details.apiUrl}`,
    `**Image:** ${details.image}`,
    `**Status:** ${details.error.message}`,
    responseSection,
    '',
    'Please investigate the deployment service.',
  ]
    .filter(Boolean)
    .join('\n');

  await octokit.rest.issues.create({ owner, repo, title, body });
}

async function postSuccessComment(githubToken, context, details) {
  if (!githubToken) {
    core.info('No GitHub token available to post success comment.');
    return;
  }
  const octokit = github.getOctokit(githubToken);
  const { owner, repo } = context.repo;
  const body = [
    `✅ Coswarm deploy succeeded for ${details.image}`,
    '',
    `**API URL:** ${details.apiUrl}`,
    `**Image:** ${details.image}`,
  ].join('\n');

  // If run from a release event, update the release body with a note
  if (context.payload && context.payload.release && context.payload.release.tag_name) {
    const tag = context.payload.release.tag_name;
    try {
      const rel = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
      const newBody = `${rel.data.body || ''}\n\n${body}`;
      await octokit.rest.repos.updateRelease({
        owner,
        repo,
        release_id: rel.data.id,
        body: newBody,
      });
      return;
    } catch (err) {
      core.warning(`Could not update release: ${err.message}`);
    }
  }

  // If triggered by a pull request, comment on the PR
  if (context.payload && context.payload.pull_request && context.payload.pull_request.number) {
    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: context.payload.pull_request.number,
        body,
      });
      return;
    } catch (err) {
      core.warning(`Could not create PR comment: ${err.message}`);
    }
  }

  // Fall back to commit comment if we have a SHA
  if (context.sha) {
    try {
      await octokit.rest.repos.createCommitComment({
        owner,
        repo,
        commit_sha: context.sha,
        body,
      });
      return;
    } catch (err) {
      core.warning(`Could not create commit comment: ${err.message}`);
    }
  }

  core.info('No suitable target found to post success comment; skipping.');
}

async function run() {
  let image = '';
  let baseUrl = '';
  let apiUrl = '';
  const githubToken =
    core.getInput('github-token') || process.env.GITHUB_TOKEN || '';

  try {
    const token = core.getInput('token', { required: true });
    image = core.getInput('image', { required: true });
    baseUrl = core.getInput('base-url', { required: true });

    apiUrl = resolveApiUrl(baseUrl);
    core.info(`Triggering deploy via ${apiUrl}`);
    const responseBody = await triggerDeploy(apiUrl, token, image);
    core.setOutput('response', responseBody);
    try {
      await postSuccessComment(githubToken, github.context, {
        apiUrl,
        image,
      });
    } catch (postErr) {
      core.warning(`Failed to post success comment: ${postErr.message}`);
    }
  } catch (error) {
    core.setFailed(error.message);
    await openFailureIssue(githubToken, github.context, {
      apiUrl: apiUrl || baseUrl || 'unknown',
      image: image || 'unknown',
      error,
    }).catch((issueError) =>
      core.warning(`Could not create failure issue: ${issueError.message}`),
    );
  }
}

run();
