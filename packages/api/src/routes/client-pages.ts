import { Router, Request, Response } from 'express';

/**
 * The client's booking page (/b/:token) and intake form (/i/:token).
 * Self-contained HTML served by the API so the links in texts work without a
 * site rebuild. Data comes from routes/client-self-serve.ts.
 */

const STYLE = `
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f6f3ec;color:#1f2937;line-height:1.45}
  main{max-width:30rem;margin:0 auto;padding:1.5rem 1.1rem 3rem}
  h1{font-size:1.5rem;margin:.25rem 0 .5rem;color:#14524a}
  h2{font-size:1rem;margin:1.5rem 0 .5rem;color:#14524a}
  p{margin:.4rem 0}
  .muted{color:#6b7280;font-size:.9rem}
  .card{background:#fff;border:1px solid #e5dfd0;border-radius:.9rem;padding:1rem;margin:1rem 0}
  .rep{display:flex;align-items:center;gap:.9rem}
  .rep img,.rep .ph{width:4rem;height:4rem;border-radius:50%;object-fit:cover;background:#d9ece8;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#14524a;flex:none}
  .slots{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
  button,.btn{font:inherit;border-radius:.6rem;padding:.75rem .5rem;border:1px solid #1d7a6d;background:#fff;color:#14524a;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;display:block;width:100%}
  button.sel,button.primary,.btn.primary{background:#1d7a6d;color:#fff}
  button.danger{border-color:#b4533c;color:#b4533c}
  button:disabled{opacity:.5;cursor:default}
  .sticky{position:sticky;bottom:0;background:#f6f3ec;padding:.75rem 0}
  .err{background:#fdecea;color:#8a2c1c;border-radius:.6rem;padding:.75rem;margin:.75rem 0}
  .ok{background:#e3f3ef;color:#14524a;border-radius:.6rem;padding:.9rem;margin:.75rem 0}
  label{display:block;font-weight:600;margin:1rem 0 .3rem}
  input[type=text],input[type=number],select,textarea{font:inherit;width:100%;padding:.7rem;border:1px solid #cfc8b6;border-radius:.6rem;background:#fff}
  .check{display:flex;gap:.6rem;align-items:flex-start;font-weight:400;margin:.45rem 0}
  .check input{margin-top:.25rem}
  [hidden]{display:none!important}
`;

const page = (title: string, body: string, script: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>${title} — Windward Financial</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<p class="muted">Windward Financial</p>
${body}
</main>
<script>
const token = location.pathname.split('/').filter(Boolean).pop();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(method, path, body) {
  const res = await fetch('/api/public/' + path + '/' + token, {
    method, headers: body ? {'Content-Type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function showError(msg) { const e = $('error'); e.textContent = msg; e.hidden = false; e.scrollIntoView({block:'center'}); }
${script}
</script>
</body>
</html>`;

const BOOKING_BODY = `
<h1 id="title">Pick a time</h1>
<div id="error" class="err" hidden></div>
<div id="loading" class="muted">Loading open times…</div>
<div id="app" hidden>
  <div class="card rep" id="rep"></div>
  <div id="existing" class="ok" hidden></div>
  <div id="picker">
    <p class="muted" id="tz"></p>
    <div id="days"></div>
    <div class="sticky"><button id="confirm" class="primary" disabled>Choose a time</button></div>
  </div>
  <div id="manage" hidden>
    <button id="change">Pick a different time</button>
    <p></p>
    <button id="cancel" class="danger">Cancel this call</button>
  </div>
</div>
<div id="done" hidden>
  <div class="ok" id="doneMsg"></div>
  <a id="intake" class="btn primary" hidden>Answer 2 minutes of questions before the call</a>
</div>`;

const BOOKING_SCRIPT = `
let data, selected = null;
const fmtDay = (d) => new Intl.DateTimeFormat('en-US', {timeZone: data.timezone, weekday:'long', month:'long', day:'numeric'}).format(d);
const fmtTime = (d) => new Intl.DateTimeFormat('en-US', {timeZone: data.timezone, hour:'numeric', minute:'2-digit'}).format(d);

function renderPicker() {
  const days = {};
  data.slots.forEach((iso) => { const k = fmtDay(new Date(iso)); (days[k] = days[k] || []).push(iso); });
  const keys = Object.keys(days);
  $('days').innerHTML = keys.length
    ? keys.map((k) => '<h2>' + esc(k) + '</h2><div class="slots">' +
        days[k].map((iso) => '<button data-iso="' + iso + '">' + esc(fmtTime(new Date(iso))) + '</button>').join('') + '</div>').join('')
    : '<div class="card">No open times in the next two weeks. Please call ' + esc(data.rep.name) + (data.rep.phone ? ' at ' + esc(data.rep.phone) : '') + '.</div>';
  $('days').querySelectorAll('button').forEach((b) => b.onclick = () => {
    selected = b.dataset.iso;
    $('days').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    const c = $('confirm'); c.disabled = false;
    c.textContent = 'Book ' + fmtDay(new Date(selected)) + ', ' + fmtTime(new Date(selected));
  });
}

function render() {
  const r = data.rep;
  const initials = r.name.split(/\\s+/).map((p) => p[0]).join('').slice(0,2).toUpperCase();
  $('rep').innerHTML = (r.photoUrl ? '<img src="' + esc(r.photoUrl) + '" alt="">' : '<div class="ph">' + esc(initials) + '</div>') +
    '<div><strong>' + esc(r.name) + '</strong>' + (r.title ? '<br><span class="muted">' + esc(r.title) + '</span>' : '') +
    '<br><span class="muted">' + data.durationMinutes + ' minutes · ' + esc(data.location) + '</span></div>';
  const tzName = new Intl.DateTimeFormat('en-US', {timeZone: data.timezone, timeZoneName: 'long'}).formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
  $('tz').textContent = 'Times shown in ' + (tzName ? tzName.value : data.timezone) + '.';
  if (data.existing) {
    $('title').textContent = 'Your call is booked';
    $('existing').textContent = 'You are booked with ' + r.name + ' on ' + data.existing.when + '.';
    $('existing').hidden = false; $('picker').hidden = true; $('manage').hidden = false;
  } else {
    $('title').textContent = 'Aloha ' + data.firstName + ', pick a time';
    $('picker').hidden = false; $('manage').hidden = true;
  }
  renderPicker();
  $('loading').hidden = true; $('app').hidden = false;
}

async function load() {
  try { data = await api('GET', 'booking'); render(); }
  catch (e) { $('loading').hidden = true; showError(e.message); }
}

$('change').onclick = () => { $('picker').hidden = false; $('manage').hidden = true; $('title').textContent = 'Pick a new time'; };
$('cancel').onclick = async () => {
  if (!confirm('Cancel your call?')) return;
  $('cancel').disabled = true;
  try { await api('DELETE', 'booking'); $('app').hidden = true; $('done').hidden = false;
        $('title').textContent = 'Cancelled'; $('doneMsg').textContent = 'Your call is cancelled. You can use this link any time to book again.'; }
  catch (e) { $('cancel').disabled = false; showError(e.message); }
};
$('confirm').onclick = async () => {
  if (!selected) return;
  $('confirm').disabled = true; $('error').hidden = true;
  try {
    const r = await api('POST', 'booking', { start: selected });
    $('app').hidden = true; $('done').hidden = false; $('title').textContent = 'You are booked';
    $('doneMsg').textContent = r.repName + ' will call you on ' + r.when + '. We texted you a confirmation.';
    if (data.intakeUrl) { $('intake').href = data.intakeUrl; $('intake').hidden = false; }
  } catch (e) { showError(e.message); selected = null; $('confirm').textContent = 'Choose a time'; await load(); }
};
load();
`;

const INTAKE_BODY = `
<h1 id="title">Before your call</h1>
<p class="muted">About 2 minutes. Your answers go only to your Windward Financial rep. Skip anything you prefer not to answer.</p>
<div id="error" class="err" hidden></div>
<div id="loading" class="muted">Loading…</div>
<form id="form" hidden>
  <label for="employmentType">Where do you work?</label>
  <select id="employmentType"><option value="">Choose…</option></select>
  <label for="employerSchool">School or department</label>
  <input type="text" id="employerSchool" autocomplete="organization">
  <label for="yearsOfService">Years of service</label>
  <input type="number" id="yearsOfService" min="0" max="60" inputmode="numeric">
  <label for="ersPlanType">Your ERS retirement plan</label>
  <select id="ersPlanType"><option value="">Choose…</option></select>
  <label for="lifeInsuranceStatus">Life insurance you have now</label>
  <select id="lifeInsuranceStatus"><option value="">Choose…</option></select>
  <label for="annualSalary">Annual salary (optional)</label>
  <input type="text" id="annualSalary" inputmode="decimal" placeholder="$">
  <label for="current403bBalance">403(b) balance, if any (optional)</label>
  <input type="text" id="current403bBalance" inputmode="decimal" placeholder="$">
  <label>What would you like help with?</label>
  <div id="goals"></div>
  <label for="notes">Anything else your rep should know?</label>
  <textarea id="notes" rows="3"></textarea>
  <p></p>
  <button class="primary" id="submit">Send to my rep</button>
</form>
<div id="done" class="ok" hidden>Mahalo. Your rep has your answers and will be ready for your call.</div>`;

const INTAKE_SCRIPT = `
const LABELS = { Unknown: 'Not sure', None: 'None', 'Employer Only': 'Through my employer only', Personal: 'My own policy', Both: 'Employer and my own' };
function fill(id, options, value) {
  $(id).insertAdjacentHTML('beforeend', options.map((o) => '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(LABELS[o] || o) + '</option>').join(''));
}
(async () => {
  try {
    const d = await api('GET', 'intake');
    $('title').textContent = 'Aloha ' + d.firstName + ', before your call';
    fill('employmentType', d.options.employmentType, d.answers.employmentType);
    fill('ersPlanType', d.options.ersPlanType, d.answers.ersPlanType);
    fill('lifeInsuranceStatus', d.options.lifeInsuranceStatus, d.answers.lifeInsuranceStatus);
    $('employerSchool').value = d.answers.employerSchool || '';
    $('yearsOfService').value = d.answers.yearsOfService ?? '';
    $('goals').innerHTML = d.options.goals.map((g, i) => '<label class="check"><input type="checkbox" value="' + esc(g) + '"> ' + esc(g) + '</label>').join('');
    $('loading').hidden = true; $('form').hidden = false;
  } catch (e) { $('loading').hidden = true; showError(e.message); }
})();
$('form').onsubmit = async (ev) => {
  ev.preventDefault(); $('submit').disabled = true; $('error').hidden = true;
  const v = (id) => $(id).value;
  try {
    await api('POST', 'intake', {
      employmentType: v('employmentType'), employerSchool: v('employerSchool'), yearsOfService: v('yearsOfService'),
      ersPlanType: v('ersPlanType'), lifeInsuranceStatus: v('lifeInsuranceStatus'), annualSalary: v('annualSalary'),
      current403bBalance: v('current403bBalance'), notes: v('notes'),
      goals: [...$('goals').querySelectorAll('input:checked')].map((c) => c.value),
    });
    $('form').hidden = true; $('done').hidden = false; window.scrollTo(0, 0);
  } catch (e) { $('submit').disabled = false; showError(e.message); }
};
`;

function send(res: Response, html: string) {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.send(html);
}

export const bookingPageRouter = Router().get('/:token', (_req: Request, res: Response) =>
  send(res, page('Book a call', BOOKING_BODY, BOOKING_SCRIPT)),
);

export const intakePageRouter = Router().get('/:token', (_req: Request, res: Response) =>
  send(res, page('Before your call', INTAKE_BODY, INTAKE_SCRIPT)),
);
