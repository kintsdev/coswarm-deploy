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
