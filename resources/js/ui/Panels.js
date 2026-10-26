import { $, el, focusable, isSafeUrl } from './dom.js';
import { STATUS } from '../config/settings.js';

const HINT = 'Not provided yet. Add it in config/portfolio.php.';

/**
 * Right-hand drawer for project/module detail. It leaves the 3D world visible on
 * the left, so reading a panel still feels like standing in the room.
 * Everything is built with textContent (no innerHTML), so config values are always inert.
 */
export class Panel {
  constructor({ data, audio, onClose }) {
    this.data = data;
    this.audio = audio;
    this.onClose = onClose;
    this.root = $('panel');
    this.title = $('panel-title');
    this.tags = $('panel-tags');
    this.body = $('panel-body');
    this.restore = null;
    $('panel-close')?.addEventListener('click', () => this.close());
    this.root?.addEventListener('keydown', (e) => this.trap(e));
  }

  get isOpen() { return !!this.root && !this.root.hidden; }

  trap(e) {
    if (e.key !== 'Tab') return;
    const f = focusable(this.root); if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  open({ title, tags = [], render, focus }) {
    this.restore = document.activeElement;
    this.title.textContent = title;
    this.tags.replaceChildren(...tags);
    this.body.replaceChildren();
    render(this.body);
    this.body.scrollTop = 0;
    this.root.hidden = false;
    requestAnimationFrame(() => {
      this.root.classList.add('open');
      const target = focus ? this.body.querySelector(`[data-section="${focus}"]`) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      this.title.focus({ preventScroll: true });
    });
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('open');
    this.root.hidden = true;
    this.restore?.blur?.();
    this.onClose?.();
  }

  /* ----------------------------------------------------------- helpers */
  statusTag(status) {
    const st = STATUS[status] ?? STATUS.planned;
    return el('span', { class: 'tag tag-status' }, el('i', { style: { background: st.color } }), st.label);
  }
  placeholderTag() { return el('span', { class: 'tag tag-placeholder', text: 'Placeholder' }); }

  section(title, key, ...content) {
    return el('section', { class: 'sec', 'data-section': key }, el('h3', { text: title }), ...content);
  }
  para(text) { return el('p', { text }); }
  muted(text = HINT) { return el('p', { class: 'muted', text }); }
  list(items) {
    return el('ul', { class: 'bullets' }, items.map((it) => {
      if (typeof it === 'string') return el('li', { text: it });
      const st = STATUS[it.status];
      return el('li', {}, it.name, st ? el('span', { class: 'mini-status' }, el('i', { style: { background: st.color } }), st.label) : null);
    }));
  }
  linkBtn(label, url, kind = '') {
    return el('a', { class: `btn ${kind}`, href: url, target: '_blank', rel: 'noopener noreferrer', text: label });
  }

  /* ------------------------------------------------------------ module */
  openModule(room, mod) {
    const ph = mod.placeholder;
    const links = Object.entries(mod.links ?? {}).filter(([, u]) => u && isSafeUrl(u));
    this.open({
      title: mod.name,
      tags: [this.statusTag(mod.status), ph ? this.placeholderTag() : null, el('span', { class: 'tag', text: room.name })].filter(Boolean),
      render: (b) => {
        b.append(this.section('The problem it solves', 'problem', mod.problem ? this.para(mod.problem) : (ph ? this.muted() : null)));
        if (mod.features.length || ph) b.append(this.section('Key features', 'features', mod.features.length ? this.list(mod.features) : this.muted()));
        if (mod.tech.length || ph) {
          b.append(this.section('Technologies', 'tech', mod.tech.length
            ? el('div', { class: 'chips' }, mod.tech.map((t) => el('span', { class: 'chip-tag', text: t })))
            : this.muted()));
        }
        if (mod.role || ph) b.append(this.section('My role', 'role', mod.role ? this.para(mod.role) : this.muted()));
        if (mod.architecture || ph) b.append(this.section('Architecture and implementation', 'architecture', mod.architecture ? this.para(mod.architecture) : this.muted()));

        const media = (mod.media ?? []).filter((m) => m && m.src && isSafeUrl(m.src));
        if (media.length) {
          b.append(this.section('Screenshots and demos', 'media', el('div', { class: 'media' }, media.map((m) => el('figure', {},
            m.type === 'video'
              ? el('video', { src: m.src, controls: true, preload: 'none', playsinline: true })
              : el('img', { src: m.src, alt: m.caption || mod.name, loading: 'lazy' }),
            m.caption ? el('figcaption', { text: m.caption }) : null)))));
        }
        if (links.length) {
          const names = { demo: 'Live demo', source: 'Source code', docs: 'Documentation' };
          b.append(this.section('Links', 'links', el('div', { class: 'btn-row' }, links.map(([k, u], i) => this.linkBtn(names[k] ?? k, u, i === 0 ? 'btn-primary' : '')))));
        }
      },
    });
  }

  /* -------------------------------------------------------------- info */
  /** Free-form panel used by info points, text boards and pictures in custom rooms. */
  openInfo({ title, body, link, link_label: linkLabel, media }) {
    this.open({
      title: title || 'Details',
      render: (b) => {
        const paragraphs = String(body ?? '').split(/\n+/).map((t) => t.trim()).filter(Boolean);
        paragraphs.forEach((t) => b.append(this.para(t)));
        if (media && media.src && isSafeUrl(media.src)) {
          b.append(el('div', { class: 'media' }, el('figure', {},
            media.type === 'video'
              ? el('video', { src: media.src, controls: true, preload: 'metadata', playsinline: true })
              : el('img', { src: media.src, alt: media.caption || title || '' }),
            media.caption ? el('figcaption', { text: media.caption }) : null)));
        }
        if (link && isSafeUrl(link)) b.append(el('div', { class: 'btn-row' }, this.linkBtn(linkLabel || 'Open link', link, 'btn-primary')));
        if (!paragraphs.length && !media && !link) b.append(this.muted('Nothing here yet.'));
      },
    });
  }

  /* ----------------------------------------------------------- profile */
  openProfile(focus) {
    const { owner, profile } = this.data;
    const ph = profile.placeholder || owner.placeholder;
    this.open({
      title: owner.name,
      focus,
      tags: [el('span', { class: 'tag', text: owner.title }), ph ? this.placeholderTag() : null].filter(Boolean),
      render: (b) => {
        if (owner.tagline) b.append(el('p', { class: 'lead', text: owner.tagline }));
        b.append(this.section('Introduction', 'intro', this.para(profile.intro ?? '')));
        b.append(this.section('How I work', 'philosophy', this.para(profile.philosophy ?? '')));
        b.append(this.section('Areas of expertise', 'expertise', this.list(profile.expertise ?? [])));
        b.append(this.section('Where I am heading', 'goals', this.list(profile.goals ?? [])));
      },
    });
  }

  /* ------------------------------------------------------------ skills */
  openSkills(cat) {
    this.open({
      title: cat.name,
      tags: [cat.placeholder ? this.placeholderTag() : null].filter(Boolean),
      render: (b) => {
        b.append(this.section('What I work with', 'items', (cat.items ?? []).length
          ? el('div', { class: 'chips' }, cat.items.map((t) => el('span', { class: 'chip-tag', text: t })))
          : this.muted()));
        b.append(this.para('Listed without self-ratings. Ask me about any of it.'));
      },
    });
  }

  /* ---------------------------------------------------------- timeline */
  openTimeline(e) {
    this.open({
      title: e.organization,
      tags: [el('span', { class: 'tag', text: e.role }), e.dates ? el('span', { class: 'tag', text: e.dates }) : null, e.placeholder ? this.placeholderTag() : null].filter(Boolean),
      render: (b) => {
        b.append(this.section('Responsibilities', 'resp', (e.responsibilities ?? []).length ? this.list(e.responsibilities) : this.muted()));
        b.append(this.section('Achievements', 'ach', (e.achievements ?? []).length ? this.list(e.achievements) : this.muted('No achievements listed yet.')));
      },
    });
  }

  /* ----------------------------------------------------------- contact */
  openContact(focus = 'links') {
    const c = this.data.contact;
    const cv = this.data.cv;
    this.open({
      title: 'Get in touch',
      focus,
      tags: [c.placeholder ? this.placeholderTag() : null].filter(Boolean),
      render: (b) => {
        const rows = [];
        if (c.email) rows.push(el('a', { class: 'btn btn-primary', href: `mailto:${c.email}`, text: c.email }));
        if (c.linkedin && isSafeUrl(c.linkedin)) rows.push(this.linkBtn('LinkedIn', c.linkedin));
        if (c.github && isSafeUrl(c.github)) rows.push(this.linkBtn('GitHub', c.github));
        b.append(this.section('Email and profiles', 'links', rows.length ? el('div', { class: 'btn-row' }, rows) : this.muted('No contact links set yet. Add them in config/portfolio.php.')));

        b.append(this.section('CV', 'cv', el('div', { class: 'btn-row' },
          el('a', { class: 'btn', href: cv.download_url, target: '_blank', rel: 'noopener', text: cv.has_pdf ? 'Download CV (PDF)' : 'Open printable CV' }),
          el('a', { class: 'btn', href: cv.page_url, target: '_blank', rel: 'noopener', text: 'Traditional CV page' }))));

        if (c.form_enabled) b.append(this.section('Send a message', 'form', this.form()));
      },
    });
  }

  form() {
    const status = el('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
    const field = (id, label, input) => el('div', { class: 'field' }, el('label', { for: id, text: label }), input, el('p', { class: 'field-error', id: `${id}-err` }));
    const name = el('input', { id: 'f-name', name: 'name', type: 'text', required: true, maxlength: '100', autocomplete: 'name' });
    const email = el('input', { id: 'f-email', name: 'email', type: 'email', required: true, maxlength: '150', autocomplete: 'email' });
    const message = el('textarea', { id: 'f-message', name: 'message', rows: '5', required: true, minlength: '10', maxlength: '4000' });
    const trap = el('input', { name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'hp' });
    const send = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Send message' });
    const form = el('form', { novalidate: true }, field('f-name', 'Your name', name), field('f-email', 'Your email', email), field('f-message', 'Message', message), trap, el('div', { class: 'btn-row' }, send), status);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      form.querySelectorAll('.field-error').forEach((n) => { n.textContent = ''; });
      status.textContent = ''; status.className = 'form-status';
      send.disabled = true; send.textContent = 'Sending…';
      try {
        const res = await fetch(this.data.endpoints.contact, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', Accept: 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
          },
          body: JSON.stringify({ name: name.value, email: email.value, message: message.value, website: trap.value }),
        });
        if (res.status === 422) {
          const { errors = {} } = await res.json();
          for (const [k, v] of Object.entries(errors)) {
            const n = form.querySelector(`#f-${k}-err`); if (n) n.textContent = v[0];
          }
          status.textContent = 'Please fix the highlighted fields.'; status.classList.add('bad');
        } else if (res.status === 429) {
          status.textContent = 'Too many messages in a short time. Try again in a minute.'; status.classList.add('bad');
        } else if (!res.ok) {
          throw new Error(String(res.status));
        } else {
          form.reset();
          status.textContent = 'Message sent. Thank you!'; status.classList.add('good');
          this.audio.ui();
        }
      } catch {
        status.textContent = 'The message could not be sent. Check your connection and try again.'; status.classList.add('bad');
      } finally {
        send.disabled = false; send.textContent = 'Send message';
      }
    });
    return form;
  }
}
