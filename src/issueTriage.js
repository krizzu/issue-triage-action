/* eslint-disable no-throw-literal */

const core = require('@actions/core');

const dryRun = !!process.env.GH_ACTION_LOCAL_TEST;

class ActionIssueTriage {
  constructor(kit, options) {
    this.kit = kit;
    this.opts = options;
  }

  _log(message) {
    if (!this.opts.showLogs) return;
    console.log(message);
  }

  async run() {
    const allIssues = await this._getAllIssues();

    if (!allIssues.length) {
      this._log(
        `No issues found for ${this.opts.repoOwner}/${this.opts.repoName}`
      );
      return;
    }

    this._log(
      `Total issues for ${this.opts.repoOwner}/${this.opts.repoName}: ${allIssues.length}`
    );

    const staleIssues = this._filterOldIssues(allIssues);

    let markedStale = 0;
    let closed = 0;

    for (const issue of staleIssues) {
      try {
        let isClosingDown = false;

        if (
          this.opts.closeAfter > this.opts.staleAfter &&
          this._isOlderThan(issue.updated_at, this.opts.closeAfter)
        ) {
          isClosingDown = true;
        }

        const postSuccess = await this._postComment(
          issue,
          isClosingDown ? this.opts.closeComment : this.opts.staleComment
        );
        if (postSuccess) {
          const updateSuccess = await this._updateIssue(issue, isClosingDown);
          if (updateSuccess) {
            if (isClosingDown) {
              closed++;
            } else {
              markedStale++;
            }
          } else {
            throw `Could not update issue #${issue.number}.`;
          }
        } else {
          throw `Could not post comment for #${issue.number}.`;
        }
      } catch (e) {
        core.warning(e);
      }
    }

    if (markedStale) {
      this._log(`Issues marked as stale: ${markedStale}`);
    }
    if (closed) {
      this._log(`Issues closed down: ${closed}`);
    }

    if (!markedStale && !closed) {
      this._log(`No old issues found, sweet!`);
    }
  }

  _isIssue(issue) {
    // PRs are also considered an issue
    return !issue.pull_request;
  }

  _isOlderThan(date, days) {
    const expirationDate = new Date() - days * 24 * 60 * 60 * 1000;
    return new Date(date) < expirationDate;
  }

  _getDaysSince(dayCreated) {
    const oneDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    return Math.round(Math.abs((now - new Date(dayCreated)) / oneDay));
  }

  _filterOldIssues(issues) {
    return issues.filter(issue =>
      this._isOlderThan(issue.updated_at, this.opts.staleAfter)
    );
  }

  _generateMessage(issue, messageTemplate) {
    /**
     * %DAYS_OLD% - how old is the issue
     * %AUTHOR% - issue creator
     */
    let message = messageTemplate.replace(
      '%DAYS_OLD%',
      this._getDaysSince(issue.updated_at)
    );
    message = message.replace('%AUTHOR%', issue.user.login);

    return message;
  }

  async _getAllIssues() {
    const issuesPerPage = 100;

    const getIssuesForPage = async page => {
      const { data: issuesResponse } = await this.kit.issues.listForRepo({
        owner: this.opts.repoOwner,
        repo: this.opts.repoName,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: issuesPerPage,
        page,
      });

      return issuesResponse.filter(this._isIssue);
    };

    try {
      const { data: repoResponse } = await this.kit.repos.get({
        owner: this.opts.repoOwner,
        repo: this.opts.repoName,
      });

      const totalIssues = repoResponse.open_issues_count;
      const pageCount = Math.ceil(totalIssues / issuesPerPage);

      const issuesPage = [];

      for (let i = 1; i <= pageCount; i++) {
        issuesPage.push(getIssuesForPage(i, issuesPerPage));
      }

      const allIssues = await Promise.all(issuesPage).then(response => {
        const data = [];
        response.forEach(responseIssue => {
          data.push(...responseIssue);
        });
        return data;
      });

      return allIssues;
    } catch (e) {
      core.error(`Error while fetching issues: ${e.message}`);
      return [];
    }
  }

  async _postComment(issue, commentTemplate) {
    const message = this._generateMessage(issue, commentTemplate);

    try {
      const params = {
        owner: this.opts.repoOwner,
        repo: this.opts.repoName,
        issue_number: issue.number,
        body: message,
      };

      if (!dryRun) {
        await this.kit.issues.createComment(params);
      }
    } catch (e) {
      core.error(
        `Could not post a comment in issue #${issue.number}: ${e.message}`
      );
      return false;
    }

    return true;
  }

  async _updateIssue(issue, closeIssue) {
    const params = {
      owner: this.opts.repoOwner,
      repo: this.opts.repoName,
      issue_number: issue.number,
    };

    if (closeIssue) {
      params.state = 'closed';
    } else {
      params.labels = [...issue.labels, this.opts.staleLabel];
    }

    try {
      if (!dryRun) {
        await this.kit.issues.update(params);
      }
    } catch (e) {
      core.error(
        `Could not ${closeIssue ? 'close' : 'update'} issue #${issue.number}: ${
          e.message
        }`
      );
      return false;
    }
    return true;
  }
}

module.exports = ActionIssueTriage;
