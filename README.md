# Issue triage

GitHub action that deals with stale issues in your project.

## Features

- find, comment and label the issue if it exceeds the selected `staleAfter` day limit 
- close the issue down after the `closeAfter` day limit is reached
- customize the comment posted when the issue is stale or closed
- select label to be set for stale issues


## Inputs

- `ghToken` **Required**, GitHub token

- `staleAfter` *int*, number of days to consider an issue to be stale, __default__: `30`
- `closeAfter` *int*, number of days after the issue should be closed (0 days means off, must be higher than `staleAfter`), __default__: `0`

- `staleLabel` *string*, a label to be set to the stale issue, __default__: `STALE`
- `staleComment` *string*, a comment placed when marking issue as stale. See a [guide on how to style this message](#styling-close-comment).
- `closeComment` *string*, a comment placed when closing issue. See a [guide on how to style this message](#styling-close-comment).

- `showLogs` *bool*. Show logs with info like total number of issues found, stale issues, closed etc. __default__: `true`


## Example usage

```yaml
name: Issue cleanup
on:
  schedule:
    - cron: '0 23 14 * *' # At 23:00, 14th day of each month
jobs:
  triage_issues:
    name: Issue triage
    runs-on: ubuntu-latest
    steps:
    - name: Find old issues and mark them stale
      uses: Krizzu/issue-triage-action@v1.0.0
      with:
        ghToken: ${{ secrets.GITHUB_TOKEN }}
        staleAfter: 30
        closeAfter: 60
        staleLabel: "STALE 📺"
        staleComment: "This issue is %DAYS_OLD% days old, marking as stale! cc: @%AUTHOR%"
        closeComment: "Issue last updated %DAYS_OLD% days ago! Closing down!"
        showLogs: true
```

## Template comment
 
 The comment is a template string with placeholders to use:

- `%AUTHOR%` - Issue creator
- `%DAYS_OLD%` - How long (in days) the issue was last updated

Example:

```yaml
with:
  closeComment: "This issue is %DAYS_OLD% old, closing down! Notifying author: @%AUTHOR%"
```

## Running locally

To test action locally, create `.env` file, with content from `.env.example`.

Run `dev` script to run.
