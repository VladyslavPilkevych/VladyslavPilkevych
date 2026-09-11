export const PROFILE_QUERY = `
query ProfileOverview($login: String!, $yearStart: DateTime!, $now: DateTime!) {
  viewer { login }
  user(login: $login) {
    login
    name
    avatarUrl(size: 460)
    company
    websiteUrl
    location
    bio
    createdAt
    followers { totalCount }
    following { totalCount }
    publicRepositories: repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    lastYear: contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
    thisYear: contributionsCollection(from: $yearStart, to: $now) {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
  }
}
`;

export const REPOSITORIES_QUERY = `
query ProfileRepositories($login: String!, $cursor: String) {
  user(login: $login) {
    repositories(
      first: 100
      after: $cursor
      ownerAffiliations: OWNER
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        description
        url
        stargazerCount
        forkCount
        isFork
        isArchived
        isPrivate
        pushedAt
        primaryLanguage { name }
        languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node { name }
          }
        }
      }
    }
  }
}
`;
