// @(#) CommitInfo : ferch commit info form GitHub repository
//
//
// @version   0.1.0
// @author    Furukawa Atsushi <atsushifx@aglabo.com>
// @date      2024-05-16
//
// @description<<
//
// fetch commit form GitHub repository
//
// <<

/**
 * class: CommitInfo
 *
 * get comit form GitHub repository  given in user, repo
 */
class CommitInfo {
  // constants
  #MAX_COMMITS = 100
  #DIFF_LINE_MAX = 12

  // field
  #_user
  #_repo

  /** @var コミット情報 */
  _commits

  /**
   * @constructor
   *
   * @param user :string github user name
   * @param repo :string github repository
   */
  constructor(user, repo) {
    this.#_user = ''
    this.#_repo = ''
    this._commits = []

    if (user) {
      this.#_user = user.trim()
    }
    if (repo) {
      this.#_repo = repo.trim()
    }
  }

  /**
   * get Repository name
   */
  getRepository() {
    return `${this.#_user} / ${this.#_repo}`
  }

  /**
   *  get Repository Owner
   */
  getOwner() {
    return this.#_user
  }

  /**
   * get github's owner url
   */
  getOwnerUrl() {
    return 'https://github.com/{$this.#_user}'
  }

  /**
   * get newest commit's date
   */
  getLatesCommitDate() {
    if (this._commits.length <= 0) {
      return null
    }

    return this._commits[0].commit.committer.date
  }

  /**
   * create gihub commit api from user and repository name
   *
   */
  getRepositoryUrl() {
    if (!this.#_user || !this.#_repo) return ''

    const repoUrl = `https://api.github.com/repos/${this.#_user}/${this.#_repo}`
    return repoUrl.toLowerCase()
  }

  getDiff(patch) {
    if (!patch) return ''

    const difflines = patch
      .split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .map(line => line.substring(1))
      .slice(0, this.#DIFF_LINE_MAX)
      .join('\n')
    return difflines
  }

  getCommitDiff(commit) {
    if (!commit) return ''

    const commitDiff = []

    for (let i = 0; i < commit.files.length; i++) {
      if (i > 0) commitDiff.push('------')
      commitDiff.push(commit.files[i].filename + '\n')
      const diff = commit.files[i].diff.split('\n')
      commitDiff.push(...diff)
      if (commitDiff.length > this.#DIFF_LINE_MAX) break
    }

    return commitDiff.join('\n')
  }

  async fetchCommits(num = 10) {
    // check parameters

    if (isNaN(num)) return await []

    if (num < 1) return await []
    if (num > this.#MAX_COMMITS) {
      num = this.#MAX_COMMITS
    }
    const apiUrl = this.getRepositoryUrl() + '/commits'
    if (!apiUrl) {
      return []
    }
    const apiUrlWithNum = `${apiUrl}?per_page=${num}`

    try {
      const response = await fetch(apiUrlWithNum)
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }
      this._commits = await response.json()
      return this._commits
    } catch (error) {
      console.error('Error fetching commits:', error)
      return []
    }
  }
  async #fetchDetail(commitSha) {
    const apiUrl = this.getApiUrl() + '/commits'
    if (!apiUrl || !commitSha) {
      return await false
    }

    const urlWithSha = `${apiUrl}/${commitSha}`

    try {
      const response = await fetch(urlWithSha)
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }
      const commitDetail = await response.json()

      // diff作成
      for (let i = 0; i < commitDetail.files.length; i++) {
        commitDetail.files[i].diff = this.getDiff(commitDetail.files[i].patch)
      }
      commitDetail.files.diff = this.getCommitDiff(commitDetail)
      return commitDetail
    } catch (error) {
      console.error(`Error fetching commit details for SHA ${commitSha}:`, error)
      return false
    }
  }

  async nthDetail(n) {
    if (isNaN(n)) return await false
    if (this._commits.length < 1) {
      await this.fetchCommits()
    }

    if (n < 0 || n >= this._commits.length) {
      return await false
    }
    const commitSha = this._commits[n].sha
    return await this.#fetchDetail(commitSha)
  }

  async fetchCommitDetails(commitNum = 5) {
    if (isNaN(commitNum)) return await false
    if (commitNum < 1) return await false
    if (commitNum > this.#MAX_COMMITS) {
      commitNum = this.#MAX_COMMITS
    }

    const commits = await this.fetchCommits(commitNum)
    if (!commits) return await false

    const commitsDiff = []
    for (let i = 0; i < commits.length; i++) {
      const detail = await this.nthDetail(i)
      if (!detail) break
      commitsDiff.push(detail)
    }
    return commitsDiff
  }
}

// exports
export {CommitInfo}
