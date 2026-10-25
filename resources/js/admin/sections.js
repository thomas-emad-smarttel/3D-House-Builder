import { el } from '../ui/dom.js';
import { uniqueId } from './util.js';

export const ownerSection = (ed, f) => [
  el('p', { class: 'lead', text: 'Shown on the welcome screen, the wall plaques, the profile room and the CV header.' }),
  f.text({ path: ['owner', 'name'], label: 'Your name', max: 120 }),
  f.text({ path: ['owner', 'title'], label: 'Professional title', max: 160 }),
  f.text({ path: ['owner', 'tagline'], label: 'Tagline', max: 300 }),
  f.text({ path: ['owner', 'location'], label: 'Location (optional)', max: 120 }),
  f.check({ path: ['owner', 'placeholder'], label: 'This is still placeholder text', hint: 'Adds a "Placeholder" tag in the game and on the CV. Untick it when the details are real.' }),
];

export const profileSection = (ed, f) => [
  el('p', { class: 'lead', text: 'The Developer Profile room and the CV introduction.' }),
  f.text({ path: ['profile', 'headline'], label: 'Headline', max: 120 }),
  f.area({ path: ['profile', 'intro'], label: 'Introduction', rows: 5, max: 2000 }),
  f.area({ path: ['profile', 'philosophy'], label: 'Professional philosophy', rows: 5, max: 2000 }),
  f.strings({ path: ['profile', 'expertise'], label: 'Main areas of expertise', addLabel: 'Add area', maxLen: 200 }),
  f.strings({ path: ['profile', 'goals'], label: 'Career goals', addLabel: 'Add goal', maxLen: 200 }),
  f.check({ path: ['profile', 'placeholder'], label: 'This profile is still placeholder text' }),
];

export const skillsSection = (ed, f) => [
  el('p', { class: 'lead', text: 'One glowing node per category in the Skills room. List only what you can stand behind: there are no ratings.' }),
  f.repeater({
    path: ['skills'], addLabel: 'Add category', max: ed.meta.max.skills, empty: 'No skill categories yet.',
    create: (arr) => ({ id: uniqueId('category', arr.map((s) => s.id)), name: '', items: [], placeholder: false, _auto: true }),
    title: (s) => s.name,
    body: (s, p, i, refresh) => {
      const idField = f.text({ path: [...p, 'id'], label: 'Identifier', max: 60 });
      return [
        f.text({
          path: [...p, 'name'], label: 'Category name', max: 80,
          onInput: (v) => {
            if (s._auto) { s.id = uniqueId(v || 'category', ed.state.skills.filter((x) => x !== s).map((x) => x.id)); idField.querySelector('input').value = s.id; }
            refresh();
          },
        }),
        f.strings({ path: [...p, 'items'], label: 'Skills in this category', addLabel: 'Add skill', maxLen: 80 }),
        f.check({ path: [...p, 'placeholder'], label: 'Placeholder content' }),
        idField,
      ];
    },
  }),
];

export const timelineSection = (ed, f) => [
  el('p', { class: 'lead', text: 'List your roles newest first, like a CV. In the game the corridor walks visitors from the oldest to the newest.' }),
  f.repeater({
    path: ['timeline'], addLabel: 'Add role', max: ed.meta.max.timeline, empty: 'No roles yet.',
    create: (arr) => ({ id: uniqueId('role', arr.map((t) => t.id)), organization: '', role: '', dates: '', responsibilities: [], achievements: [], placeholder: false, _auto: true }),
    title: (t) => [t.role, t.organization].filter(Boolean).join(' · '),
    body: (t, p, i, refresh) => {
      const idField = f.text({ path: [...p, 'id'], label: 'Identifier', max: 60 });
      return [
        f.text({
          path: [...p, 'organization'], label: 'Company or project', max: 120,
          onInput: (v) => {
            if (t._auto) { t.id = uniqueId(v || 'role', ed.state.timeline.filter((x) => x !== t).map((x) => x.id)); idField.querySelector('input').value = t.id; }
            refresh();
          },
        }),
        f.text({ path: [...p, 'role'], label: 'Your role', max: 120, onInput: refresh }),
        f.text({ path: [...p, 'dates'], label: 'Dates', max: 60, placeholder: 'e.g. 2021 – 2024' }),
        f.strings({ path: [...p, 'responsibilities'], label: 'Main responsibilities', addLabel: 'Add responsibility', maxLen: 300 }),
        f.strings({ path: [...p, 'achievements'], label: 'Significant achievements', addLabel: 'Add achievement', maxLen: 300 }),
        f.check({ path: [...p, 'placeholder'], label: 'Placeholder content' }),
        idField,
      ];
    },
  }),
];

export const contactSection = (ed, f) => [
  el('p', { class: 'lead', text: 'Leave a link empty to hide it. Nothing is shown that you have not entered.' }),
  f.text({ path: ['contact', 'email'], label: 'Public email', type: 'email', max: 150 }),
  f.text({ path: ['contact', 'linkedin'], label: 'LinkedIn URL', placeholder: 'https://www.linkedin.com/in/…', max: 500 }),
  f.text({ path: ['contact', 'github'], label: 'GitHub URL', placeholder: 'https://github.com/…', max: 500 }),
  f.file({ path: ['cv_file'], label: 'CV (PDF)', kinds: ['pdf'], valueKey: 'path', placeholder: 'storage/portfolio/cv.pdf', hint: 'Used by the Download CV button. Without a PDF the button opens the printable CV page.' }),
  f.check({ path: ['contact', 'form_enabled'], label: 'Show the contact form in the game' }),
  f.text({ path: ['contact', 'receive_email'], label: 'Send form messages to', type: 'email', max: 150, hint: 'Private: never sent to visitors. Needs a mail driver in .env; otherwise messages go to storage/logs/laravel.log.' }),
  f.check({ path: ['contact', 'placeholder'], label: 'Contact details are still placeholders' }),
];

export const settingsSection = (ed, f) => [
  el('p', { class: 'lead', text: 'Look and performance of the 3D experience.' }),
  f.area({ path: ['settings', 'welcome_lead'], label: 'Welcome screen text', rows: 3, max: 400 }),
  f.number({ path: ['settings', 'exposure'], label: 'Brightness (exposure)', min: 0.5, max: 2.5, step: 0.05, hint: '1.15 is the default. Raise it if rooms look too dark on your display.' }),
  f.check({ path: ['settings', 'shadows'], label: 'Real-time shadows', hint: 'Turn off for a big speed-up on weak graphics cards.' }),
  f.number({ path: ['settings', 'max_pixel_ratio'], label: 'Maximum render sharpness', min: 1, max: 3, step: 0.25, hint: 'Lower is faster on high-density screens. 1.75 is the default.' }),
];
