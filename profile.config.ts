import type { ProfileConfig } from './src/config/types.ts';

const profileConfig: ProfileConfig = {
  githubUsername: 'VladyslavPilkevych',

  personal: {
    name: 'Vladyslav Pilkevych',
    title: 'Software Engineer',
    email: 'vladyslav.pilkevych@gmail.com',
    phone: null,
    website: 'vladyslavpilkevych.com',
    location: null,
    company: null,
    languages: [],
    codingSince: '2021-09-05',
  },

  terminal: {
    username: 'vlad',
    hostname: 'github',
    shell: 'zsh',
    promptSymbol: '$',
    workingDirectory: '~/profile',
    windowTitle: 'profile.sh',
    farewell: 'thanks for stopping by',
  },

  avatar: {
    enabled: true,
    width: 62,
    characterRamp: ' .:-=+*#%@',
    cellAspectRatio: 2.05,
    contrast: 1.45,
    brightness: -0.04,
    gamma: 1.2,
    invert: false,
    sampling: 'lanczos',
    trimBorder: 0.04,
    focusX: 0.5,
    focusY: 0.5,
    normalize: true,
    normalizeClip: 0.02,
    subjectBoost: 0,
  },

  github: {
    excludedRepositories: ['VladyslavPilkevych'],
    excludedLanguages: [],
    includeForks: false,
    includeArchived: false,
    featuredRepositories: ['zerogravity-ui', 'GraphPilot', 'taskboard-desktop'],
    maxLanguages: 7,
    groupRemainderAs: 'other',
    minLanguageShare: 0.5,
  },

  sections: {
    asciiAvatar: true,
    identity: true,
    githubStats: true,
    languageStats: true,
    techStack: true,
    contributionGraph: true,
    recentActivity: true,
    featuredRepositories: true,
  },

  stack: {
    technologies: ['typescript', 'react', 'node', 'java', 'docker'],
    groups: [
      { label: 'languages', items: ['typescript', 'javascript', 'java', 'kotlin', 'c'] },
      { label: 'frontend', items: ['react', 'vue', 'redux', 'sass', 'mui', 'vuetify'] },
      { label: 'backend', items: ['node', 'spring', 'sqlite'] },
      { label: 'tooling', items: ['git', 'docker', 'npm', 'pnpm', 'figma'] },
    ],
  },

  theme: {
    dark: {
      background: '#0a0e13',
      surface: '#0d1219',
      chrome: '#111a24',
      border: '#1b2430',
      borderStrong: '#2b3a4a',
      text: '#d4dfea',
      textMuted: '#94a5b9',
      textDim: '#64788e',
      accent: '#5ec8e0',
      accentAlt: '#e3b341',
      prompt: '#e3b341',
      success: '#6ad39f',
      warning: '#e3b341',
      danger: '#f07178',
      barTrack: '#1b2430',
      contribution: {
        empty: '#141d27',
        levels: ['#1e3f63', '#2f7ca3', '#49b6cb', '#7ef0dc'],
      },
    },
    light: {
      background: '#fbfcfe',
      surface: '#ffffff',
      chrome: '#eef2f7',
      border: '#dde4ec',
      borderStrong: '#bccadb',
      text: '#131c26',
      textMuted: '#46586b',
      textDim: '#6a7c90',
      accent: '#0e6a87',
      accentAlt: '#8a5406',
      prompt: '#8a5406',
      success: '#14724a',
      warning: '#8a5406',
      danger: '#a92a2f',
      barTrack: '#e4eaf1',
      contribution: {
        empty: '#e7edf3',
        levels: ['#bde0ea', '#78c0d7', '#3a8fb4', '#0f5c7c'],
      },
    },
    typography: {
      fontFamily:
        "ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace",
      fontSize: 14,
      cellWidth: 8.4,
      lineHeight: 20,
      asciiFontSize: 8.2,
    },
    spacing: {
      canvasWidth: 960,
      padding: 26,
      sectionGap: 26,
      cornerRadius: 12,
    },
  },
};

export default profileConfig;
