export const SITE = {
  name: 'Anish Gupta',
  url: 'https://theflamebeast.github.io',
  role: 'Software developer',
  school: 'CS at the University of Georgia',
  tagline: 'I build multiplayer games, game servers and the tools around them.',
  location: 'Georgia, USA',
  timeZone: 'America/New_York',
  email: 'anishguptaa18@gmail.com',
  links: {
    github: 'https://github.com/theflamebeast',
    linkedin: 'https://www.linkedin.com/in/anishgupta25',
    email: 'mailto:anishguptaa18@gmail.com',
  },
} as const;

export const EDUCATION = {
  school: 'University of Georgia',
  degree: 'B.S. Computer Science',
  expected: 'May 2028',
} as const;

export const SKILLS: { languages: string[]; frameworks: string[]; tools: string[] } = {
  languages: ['Java', 'C', 'C#', 'Python', 'TypeScript', 'JavaScript', 'HTML/CSS'],
  frameworks: ['Node.js', 'Next.js', 'React', 'PixiJS', 'WebSockets', 'Vitest'],
  tools: ['Git', 'Linux', 'IntelliJ IDEA', 'Visual Studio', 'VS Code', 'Unity'],
};

export const CERTS: { name: string; issuer: string; year: number; url?: string }[] = [
  {
    name: 'GIAC Foundational Cybersecurity Technologies (GFACT)',
    issuer: 'SANS Institute',
    year: 2023,
    url: 'https://api.badgr.io/public/assertions/aINl5GbbR12YXetk2ki9jA',
  },
  { name: 'IT Specialist: Software Development', issuer: 'Certiport / Pearson VUE', year: 2024 },
  { name: 'Unity Certified Associate: Game Developer', issuer: 'Unity Technologies', year: 2024 },
];
