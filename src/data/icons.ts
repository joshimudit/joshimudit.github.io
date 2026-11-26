// 24x24 icon paths for profile links, used on Home and in the footer.
import { siGithub, siOrcid } from 'simple-icons';

export const icons: Record<string, string> = {
  LinkedIn: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
  ORCID: siOrcid.path,
  GitHub: siGithub.path,
  'AGRI-DRY profile': 'M12 2C7 7 5 11 5 14a7 7 0 0 0 14 0c0-3-2-7-7-12Zm0 18.5a5.5 5.5 0 0 1-5.5-5.5c0-1.6.8-3.9 3-6.9V20a5.4 5.4 0 0 0 2.5.5Z',
  // angle brackets with a slash: the website's source code
  Source: 'M8.7 6.3 3 12l5.7 5.7 1.4-1.4L5.8 12l4.3-4.3ZM15.3 6.3l-1.4 1.4 4.3 4.3-4.3 4.3 1.4 1.4L21 12ZM13.2 4.5l-4.4 15 1.9.5 4.4-15Z',
};
