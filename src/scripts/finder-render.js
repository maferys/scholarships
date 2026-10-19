// DOM builders for the finder's result cards. Uses textContent only, never innerHTML.

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

const ICONS = { likely_eligible: '✓', likely_not_eligible: '✕', depends: '!', not_verified: '?' };

function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function contactBlock(program, s) {
  if (!program) return null;
  const a = program.administrator;
  return el('p', { class: 'contact' },
    `${s.contact}: `,
    el('a', { href: a.url, rel: 'noopener', target: '_blank' }, a.name),
    a.phone ? ` · ${a.phone}` : null,
    a.email ? ` · ${a.email}` : null,
  );
}

function programNotices(program, notices, lang, s) {
  const out = [];
  if (notices.includes('settling')) out.push(el('p', { class: 'banner banner-warn', role: 'note' }, s.settlingBanner));
  if (notices.includes('funded_account_gate') && program?.who_gets_funds_note) {
    out.push(el('div', { class: 'banner banner-info', role: 'note' },
      el('strong', {}, s.fundsGateTitle), ' ', program.who_gets_funds_note[lang]));
  }
  return out;
}

function reportForm(s, lang, context) {
  const status = el('p', { class: 'form-status', role: 'status' });
  const form = el('form', { class: 'stack report', hidden: true },
    el('label', {}, s.reportLabel, el('textarea', { name: 'message', required: true, maxlength: '2000', rows: '3' }),
      el('small', { class: 'field-note' }, s.noPersonalDetails)),
    el('label', {}, s.reportEmailLabel, el('input', { type: 'email', name: 'email', autocomplete: 'email' })),
    el('button', { type: 'submit' }, s.reportSend),
    status,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { ...context, lang, message: form.elements.message.value, email: form.elements.email.value };
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      status.textContent = s.reportThanks;
      form.reset();
    } catch {
      status.textContent = 'Error';
    }
  });
  const toggle = el('button', { type: 'button', class: 'link-button', onclick: () => { form.hidden = !form.hidden; } }, s.reportButton);
  return el('div', {}, toggle, form);
}

export function renderAnswer({ answer, category, lang, s, tip, query }) {
  const { label, reason, rule, program, source, notices } = answer;
  const verified = label !== 'not_verified';
  return el('article', { class: `answer answer-${label}` },
    ...programNotices(program, notices, lang, s),
    el('p', { class: `badge badge-${label}` }, el('span', { 'aria-hidden': 'true' }, ICONS[label]), ' ', s.labels[label]),
    el('h2', {}, category.name[lang]),
    el('p', { class: 'muted' }, `${program.state} · ${program.name[lang]}`),
    verified
      ? el('section', {},
          el('h3', {}, s.whatItDependsOn),
          el('p', {}, rule.conditions_text[lang]),
          rule.conditions?.requires_approved_vendor ? el('p', {}, s.approvedVendorNote) : null,
          rule.conflict_note
            ? el('div', { class: 'banner banner-warn conflict', role: 'note' },
                el('strong', {}, s.conflictTitle), ' ', rule.conflict_note[lang])
            : null)
      : el('section', {}, el('p', {}, s.reasons[reason] ?? s.reasons.no_rule), contactBlock(program, s)),
    verified && source
      ? el('section', { class: 'source' },
          el('h3', {}, s.officialSource),
          rule.quote ? el('blockquote', {}, `“${rule.quote}”`) : null,
          el('p', {}, el('a', { href: source.url, rel: 'noopener', target: '_blank' }, source.title), ` · ${rule.locator}`),
          el('p', { class: 'muted' }, `${s.lastVerified}: ${formatDate(rule.last_verified, lang)}`))
      : null,
    verified && tip ? el('section', {}, el('h3', {}, s.howToSubmit), el('p', {}, (rule.submit_tip ?? tip)[lang])) : null,
    notices.includes('draft')
      ? el('div', { class: 'banner banner-draft' },
          el('p', {}, s.draftBadge),
          rule?.review_flag ? el('p', {}, `${s.reviewFlag}: ${rule.review_flag}`) : null)
      : null,
    el('p', { class: 'disclaimer' }, s.disclaimer),
    reportForm(s, lang, { program: program.id, category: category.id, label, rule: rule?.id ?? null, query }),
  );
}

export function renderNotSure({ s, lang, program, categories, onPick }) {
  const select = el('select', { onchange: (e) => e.target.value && onPick(e.target.value) },
    el('option', { value: '' }, s.choose),
    ...[...categories]
      .sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang))
      .map((c) => el('option', { value: c.id }, c.name[lang])),
  );
  return el('article', { class: 'answer answer-not_verified' },
    el('h2', {}, program ? s.notSureTitle : s.reasons.unknown_program),
    program ? el('p', {}, s.notSureBody) : null,
    contactBlock(program, s),
    program ? el('label', {}, s.pickCategoryLabel, select) : null,
  );
}

export function renderSuggestions({ s, lang, categories, ids, onPick }) {
  return el('p', { class: 'suggestions' },
    `${s.didYouMean} `,
    ...ids.map((id) => el('button', { type: 'button', class: 'chip', onclick: () => onPick(id) },
      categories.find((c) => c.id === id).name[lang])),
  );
}
