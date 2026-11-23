import type { APIRoute } from 'astro';
import { CERTS, EDUCATION, SITE, SKILLS } from '../data/site';
import { loadProjects, type Project } from '../lib/projects';

const caseStudy = (p: Project) => `${SITE.url}/work/${p.id}/`;

const entry = (p: Project, url: string | null) => {
  const { title, summary, role, start, end, stack } = p.data;
  const span = `${start} to ${end ?? 'present'}`;
  const head = url ? `[${title}](${url})` : title;
  return `- ${head}: ${summary} ${role}, ${span}. Built with ${stack.join(', ')}.`;
};

export const GET: APIRoute = async () => {
  const { featured, compact } = await loadProjects();

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.role} studying ${EDUCATION.degree} at the ${EDUCATION.school}, expected ${EDUCATION.expected}. ${SITE.tagline}`,
    '',
    '## Projects',
    '',
    ...featured.map((p) => entry(p, caseStudy(p))),
    ...compact.map((p) => {
      const first = p.data.links[0];
      return entry(p, first ? first.href : null);
    }),
    '',
    '## Skills',
    '',
    `- Languages: ${SKILLS.languages.join(', ')}`,
    `- Frameworks: ${SKILLS.frameworks.join(', ')}`,
    `- Tools: ${SKILLS.tools.join(', ')}`,
    '',
    '## Certifications',
    '',
    ...CERTS.map((c) => `- ${c.name}, ${c.issuer}, ${c.year}`),
    '',
    '## Contact',
    '',
    `- [GitHub](${SITE.links.github})`,
    `- [LinkedIn](${SITE.links.linkedin})`,
    `- Email: ${SITE.email}`,
    '',
    '## Site',
    '',
    `- [Portfolio home](${SITE.url}/)`,
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
