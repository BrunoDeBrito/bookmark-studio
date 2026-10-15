import { z } from 'zod'
import type { LinkItem } from './organize'

// Provider-neutral prompt and response schemas for the AI organizer. Nothing here knows which
// AI answers it: adapters in ./ai turn these into provider calls.

export const RULES = `You reorganize a user's browser bookmarks into a clean folder tree.

Goal: few top-level folders with topic subfolders, so any link can be found without opening folders one by one.

Rules:
- Classify each link by its content (title + domain + URL path), not by the folder it currently sits in; current folders are often wrong or duplicated.
- Folder names in English, Words-Joined-By-Hyphens (e.g. "Dev-Tools", "Self-Hosted").
- Keep the hierarchy shallow: 6 to 12 top-level folders, at most 3 levels deep. A subfolder should hold at least ~5 links; split a folder that would exceed ~60 links along a natural axis (framework, ecosystem, kind of use).
- Generic items of a topic sit directly in the parent folder (Symfony goes in "Frameworks/PHP"), while big sub-topics get a subfolder ("Frameworks/PHP/Laravel").
- Specific beats generic: a Vue-only UI library goes with Vue, a Laravel package goes with Laravel even if it is a GitHub repo, an article goes with its topic.
- No "Misc"/"Others" catch-all for technical content: find the best home for each link. Only truly topic-less links stay at the root (folder "").
- Work and personal account links (dashboards, admin panels, localhost, Jira, private project URLs, URLs containing a username) go to "Personal-Work". Non-technical things (college, shopping, leisure) go under "Others/<topic>".

Reference taxonomy for developer bookmarks (adapt it to the real content; drop what is unused, add what is missing):
AI/
Backend/  APIs-Webhooks, Auth-Security, BaaS-CMS, Database
Career-Learning/  Challenges-Practice, Courses, Freelance-Jobs
Content/  Blogs, News-Portals, Newsletters-Podcasts, Portfolios
Design/  Colors-Gradients, Fonts, Icons-Illustrations, Inspiration-UX, Tools
Dev-Tools/  Docs-Reference, Git, GitHub-Repos, Playgrounds-Editors, Testing-QA, Utilities
DevOps-Infra/  CLI-Terminal, Deploy-Cloud, Linux-Desktop, Monitoring-Analytics, Self-Hosted
Frameworks/  CSS, JS (Libraries, Node-Backend, React-Next, Tooling, Vue-Nuxt), Mobile-Desktop, Other-Languages, PHP (Laravel, Tools), UI (Animation, Components, Shadcn, Templates-Kits)
Personal-Work/
SaaS-Apps/  Business-Marketing, Productivity-Notes

Ambiguous cases:
- Content/Portfolios is someone's personal home page; Content/Blogs holds blog sites, company blogs and single articles.
- UI/Shadcn is anything in the shadcn/ui ecosystem; UI/Components holds generic or Tailwind/CSS kits; standalone JS widgets (date pickers, editors, tooltips, charts) go to JS/Libraries.
- Dev-Tools/Docs-Reference is for reading (MDN, cheat sheets, patterns); Dev-Tools/Utilities is for using (generators, converters, testers).
- Dev-Tools/GitHub-Repos only for repositories with no clear topic.`

export const TaxonomySchema = z.object({
  folders: z
    .array(z.string())
    .describe('Every folder path of the new tree, parents included, using "/" as separator, e.g. "Frameworks/PHP/Laravel".'),
})

export const AssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      id: z.string(),
      folder: z.string().describe('One of the given folder paths, or "" to leave the link at the root.'),
    }),
  ),
})

const LISTING_HEADER = 'Each line: id<TAB>title<TAB>domain/path<TAB>current folder'

function describeLink(link: LinkItem): string {
  let where = link.url
  try {
    const u = new URL(link.url)
    where = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')
  } catch {
    /* keep the raw url */
  }
  return `${link.id}\t${link.title || '(sem título)'}\t${where}\t${link.path || '/'}`
}

export function taxonomyPrompt(links: LinkItem[]): string {
  return `Design the folder tree for these ${links.length} bookmarks. List every folder path the tree needs.\n${LISTING_HEADER}\n\n${links.map(describeLink).join('\n')}`
}

export function classifySystem(folders: string[]): string {
  return `${RULES}\n\nThe folder tree is already decided. Assign every link to exactly one of these folder paths (or "" for the root):\n${[...folders].sort().join('\n')}`
}

export function classifyPrompt(links: LinkItem[]): string {
  return `Assign each of these ${links.length} links to a folder. Return one entry per id.\n${LISTING_HEADER}\n\n${links.map(describeLink).join('\n')}`
}

export function cleanPath(path: string): string {
  return path.trim().replace(/^\/+|\/+$/g, '')
}
