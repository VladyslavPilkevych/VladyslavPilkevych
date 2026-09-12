export type Nullable<T> = T | null;

export interface PersonalConfig {
  name: Nullable<string>;
  title: Nullable<string>;
  email: Nullable<string>;
  phone: Nullable<string>;
  website: Nullable<string>;
  location: Nullable<string>;
  company: Nullable<string>;
  languages: string[];
  codingSince: Nullable<string>;
}

export interface TerminalConfig {
  username: string;
  hostname: string;
  shell: string;
  promptSymbol: string;
  workingDirectory: string;
  windowTitle: Nullable<string>;
  farewell: Nullable<string>;
}

export type AvatarSampling = 'box' | 'lanczos';

export interface AvatarConfig {
  enabled: boolean;
  width: number;
  characterRamp: string;
  cellAspectRatio: number;
  contrast: number;
  brightness: number;
  gamma: number;
  invert: boolean;
  sampling: AvatarSampling;
  trimBorder: number;
  focusX: number;
  focusY: number;
  normalize: boolean;
  normalizeClip: number;
  subjectBoost: number;
}

export interface GitHubConfig {
  excludedRepositories: string[];
  excludedLanguages: string[];
  includeForks: boolean;
  includeArchived: boolean;
  featuredRepositories: string[];
  maxLanguages: number;
  groupRemainderAs: Nullable<string>;
  minLanguageShare: number;
}

export interface SectionsConfig {
  asciiAvatar: boolean;
  identity: boolean;
  githubStats: boolean;
  languageStats: boolean;
  techStack: boolean;
  contributionGraph: boolean;
  recentActivity: boolean;
  featuredRepositories: boolean;
}

export interface StackConfig {
  technologies: string[];
  groups: StackGroup[];
}

export interface StackGroup {
  label: string;
  items: string[];
}

export interface Palette {
  background: string;
  surface: string;
  chrome: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentAlt: string;
  prompt: string;
  success: string;
  warning: string;
  danger: string;
  barTrack: string;
  contribution: ContributionPalette;
}

export interface ContributionPalette {
  empty: string;
  levels: [string, string, string, string];
}

export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;
  cellWidth: number;
  lineHeight: number;
  asciiFontSize: number;
}

export interface SpacingConfig {
  canvasWidth: number;
  padding: number;
  sectionGap: number;
  cornerRadius: number;
}

export interface ThemeConfig {
  dark: Palette;
  light: Palette;
  typography: TypographyConfig;
  spacing: SpacingConfig;
}

export interface AnimationConfig {
  enabled: boolean;
  frameDelay: number;
  chromeDelay: number;
  heroDelay: number;
  typingDuration: number;
  avatarRevealDelay: number;
  avatarRevealDuration: number;
  identityRevealDelay: number;
  identityRowStagger: number;
  statsRevealDelay: number;
  statsRowStagger: number;
  barFillDelay: number;
  barFillDuration: number;
  barFillStagger: number;
  stackRevealDelay: number;
  stackRowStagger: number;
  graphRevealDelay: number;
  graphRevealDuration: number;
  activityRevealDelay: number;
  activityRowStagger: number;
  footerDelay: number;
  sectionFadeDuration: number;
  cursorBlinkPeriod: number;
  statusPulsePeriod: number;
  idleLoopDuration: number;
}

export interface ProfileConfig {
  githubUsername: string;
  personal: PersonalConfig;
  terminal: TerminalConfig;
  avatar: AvatarConfig;
  github: GitHubConfig;
  sections: SectionsConfig;
  stack: StackConfig;
  animation: AnimationConfig;
  theme: ThemeConfig;
}

export type ThemeName = 'dark' | 'light';
