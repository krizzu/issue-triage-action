const github = require('@actions/github');
const core = require('@actions/core');
const ActionIssueTriage = require('./issueTriage');

const { GITHUB_REPOSITORY } = process.env;
const [repoOwner, repoName] = GITHUB_REPOSITORY.split('/');

const staleCommentDefault = `🤖 Beep Boop 🤖 \n\nThis issue was last updated %DAYS_OLD% days ago! Marking as STALE.\n CC @%AUTHOR%`;
const closeCommentDefault = `🤖 Beep Boop 🤖 \n\nThis issue was inactive for %DAYS_OLD% days, so closing it down. If you have something to add, please feel free to reopen.\n\nCC @%AUTHOR%`;

const staleAfter = core.getInput('staleAfter') || 30;
const closeAfter = core.getInput('closeAfter') || 0;
const staleComment = core.getInput('staleComment') || staleCommentDefault;
const closeComment = core.getInput('staleComment') || closeCommentDefault;
const staleLabel = core.getInput('staleLabel') || 'STALE';
const showLogs = core.getInput('showLogs') || 'true';

const GH_TOKEN = core.getInput('ghToken', {
  required: true,
});

const options = {
  repoOwner,
  repoName,
  staleAfter: +staleAfter,
  closeAfter: +closeAfter,
  staleComment,
  closeComment,
  staleLabel,
  showLogs: showLogs === 'true',
};

const action = new ActionIssueTriage(new github.GitHub(GH_TOKEN), options);

action.run();
