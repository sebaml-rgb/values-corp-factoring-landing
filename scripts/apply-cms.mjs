import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { loadContent } from '../lib/cms-store.js';
import { PILLAR_ICONS, SVC_ICONS } from '../cms/icons.mjs';

const ROOT = process.cwd();
const targetArg = process.argv.find((a) => a.startsWith('--dir='));
const TARGET_DIR = targetArg ? path.resolve(ROOT, targetArg.slice(6)) : ROOT;

function getAt(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function photoJpg(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  return photo.jpg || photo.webp || null;
}

function renderMember(member) {
  const name = escapeHtml(member.name || '');
  const role = escapeHtml(member.role || '');
  const jpg = photoJpg(member.photo);
  if (jpg) {
    const webp = member.photo?.webp && member.photo.webp !== jpg
      ? `<source srcset="${escapeHtml(member.photo.webp)}" type="image/webp">`
      : '';
    const avatarInner = `<picture>${webp}<img src="${escapeHtml(jpg)}" alt="${name}" loading="lazy" width="400" height="400" /></picture>`;
    return `<div class="fs-member"><div class="fs-member__avatar">${avatarInner}</div><div class="fs-member__name">${name}</div><div class="fs-member__role">${role}</div></div>`;
  }
  const initials = escapeHtml(member.initials || name.slice(0, 2).toUpperCase());
  return `<div class="fs-member"><div class="fs-member__avatar fs-member__avatar--ph" aria-hidden="true">${initials}</div><div class="fs-member__name">${name}</div><div class="fs-member__role">${role}</div></div>`;
}

function renderValue(item) {
  return `<div class="fs-value"><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.body || '')}</p></div>`;
}

function renderPilar(item) {
  const icon = PILLAR_ICONS[item.icon] || PILLAR_ICONS.bolt;
  return `<div class="fs-pilar"><div class="fs-pilar__texture" aria-hidden="true"></div><div class="fs-pilar__body"><div class="fs-pilar__ic" aria-hidden="true">${icon}</div><div><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.body || '')}</p></div></div></div>`;
}

function renderSolCardLanding(item) {
  const text = item.summary || item.body || '';
  return `<article class="fs-sol-card-landing"><p class="fs-sol-card-landing__pain">${escapeHtml(item.pain || '')}</p><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(text)}</p></article>`;
}

function renderSvc(item, seq) {
  const icon = SVC_ICONS[item.icon] || SVC_ICONS.invoice;
  const style = `{{ svcStyle${seq} }}`;
  return `<article class="fs-svc" data-fs-reveal="" style="${style}"><div class="fs-svc__ic" aria-hidden="true">${icon}</div><p class="fs-svc__pain">${escapeHtml(item.pain || '')}</p><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.body || '')}</p><a class="fs-svc__more" href="/factoring#contacto">Quiero esta solución →</a></article>`;
}

function renderProcessStep(item, index, total) {
  const num = String(index + 1).padStart(2, '0');
  const rail =
    index < total - 1
      ? '<span class="fs-como-timeline__rail" aria-hidden="true"></span>'
      : '';
  return `<article class="fs-como-timeline__step">${rail}<div class="fs-como-timeline__num">${num}</div><div class="fs-como-timeline__body"><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.body || '')}</p></div></article>`;
}

function renderProcessActor(item, index) {
  const n = index + 1;
  return `<div class="fs-process-actor" style="{{ actorHL${n} }}"><div class="fs-process-actor__n">${n}</div><h3 style="font-size:17px;font-weight:600;margin:0 0 8px;color:var(--fs-c-dark)">${escapeHtml(item.title || '')}</h3><p style="font-size:14px;line-height:1.55;color:#595959;margin:0">${escapeHtml(item.body || '')}</p></div>`;
}

function renderOnboardStep(item, index) {
  const n = index + 1;
  return `<button type="button" class="fs-onboard-step" style="{{ vizSt${n} }}" onclick="{{ wfGo${n} }}" aria-current="{{ wfCurrent${n} }}"><img src="${escapeHtml(item.image || '')}" alt="" width="512" height="512" loading="lazy" decoding="async"><span class="fs-onboard-step__num">${escapeHtml(item.stepLabel || '')}</span></button>`;
}

function renderOnboardTab(label, index) {
  const n = index + 1;
  return `<button type="button" class="fs-process-viz__tab" style="{{ vizTab${n} }}" onclick="{{ wfGo${n} }}">${escapeHtml(label)}</button>`;
}

function renderProcessReq(item) {
  return `<div class="fs-process-req"><span class="fs-process-req__ic-wrap"><img class="fs-process-req__ic" src="${escapeHtml(item.icon || '')}" alt="" width="512" height="512" loading="lazy" decoding="async"></span><strong>${escapeHtml(item.title || '')}</strong> ${escapeHtml(item.body || '')}</div>`;
}

function renderAgStat(item) {
  const numClass = item.numCompact ? 'fs-ag__stat-num fs-ag__stat-num--compact' : 'fs-ag__stat-num';
  const num = escapeHtml(item.num || '');
  return `<div class="fs-ag__stat-row"><div class="${numClass}">${num}</div><div><div class="fs-ag__stat-label">${escapeHtml(item.label || '')}</div><p class="fs-ag__stat-desc">${escapeHtml(item.desc || '')}</p></div></div>`;
}

function renderIndustryChip(label, seq) {
  return `<span class="fs-chip" style="{{ chipStyle${seq} }}"><span class="fs-chip__ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"></circle></svg></span>${escapeHtml(label)}</span>`;
}

function renderLegalSections(sections) {
  if (!Array.isArray(sections)) return '';
  return sections
    .map((sec) => {
      const title = sec.title ? `<h2>${escapeHtml(sec.title)}</h2>` : '';
      const paras = (sec.paragraphs || []).map((p) => `<p>${p}</p>`).join('');
      const list =
        sec.list && sec.list.length
          ? `<ul>${sec.list.map((li) => `<li>${li}</li>`).join('')}</ul>`
          : '';
      const tail = (sec.paragraphsAfter || []).map((p) => `<p>${p}</p>`).join('');
      return `${title}${paras}${list}${tail}`;
    })
    .join('\n\n');
}

async function collectHtmlFiles(dir) {
  const out = [];
  async function walk(rel) {
    const abs = path.join(dir, rel);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const ent of entries) {
      const next = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (['node_modules', 'dist', '.git', 'admin', 'scripts', 'lib'].includes(ent.name)) continue;
        await walk(next);
      } else if (ent.name.endsWith('.html')) {
        out.push(path.join(dir, next));
      }
    }
  }
  await walk('');
  return out;
}

function applyHrefFrom($, content) {
  $('[data-cms-href-from]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-href-from');
    const val = getAt(content, key);
    if (val === undefined || val === null) return;
    const prefix = $el.attr('data-cms-href-prefix') || '';
    $el.attr('href', `${prefix}${val}`);
  });
}

function applyFields($, content) {
  $('[data-cms]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms');
    const val = getAt(content, key);
    if (val === undefined || val === null) return;
    const attr = $el.attr('data-cms-attr');
    const prefix = $el.attr('data-cms-prefix') || '';
    if (attr) {
      $el.attr(attr, `${prefix}${val}`);
      if (!$el.attr('data-cms-keep-text') && !['src', 'content', 'href'].includes(attr)) {
        $el.text(String(val));
      }
    } else if ($el.attr('data-cms-html') === 'true') {
      $el.html(String(val));
    } else {
      $el.text(String(val));
    }
  });
}

function applyLists($, content) {
  $('[data-cms-list]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-list');
    const items = getAt(content, key);
    if (!Array.isArray(items)) return;
    const kind = $el.attr('data-cms-list-type') || 'team';
    let html = '';
    switch (kind) {
      case 'values':
        html = items.map(renderValue).join('');
        break;
      case 'pilar':
        html = items.map(renderPilar).join('');
        break;
      case 'sol-card':
        html = items.map(renderSolCardLanding).join('');
        break;
      case 'svc':
        html = items.map((it, i) => renderSvc(it, i + 1)).join('');
        break;
      case 'process-step':
        html = items.map((it, i) => renderProcessStep(it, i, items.length)).join('');
        break;
      case 'industry-chip':
        html = items.map((label, i) => renderIndustryChip(label, i + 1)).join('');
        break;
      case 'ag-stat':
        html = items.map(renderAgStat).join('');
        break;
      case 'process-actor':
        html = items.map((it, i) => renderProcessActor(it, i)).join('');
        break;
      case 'onboard-step':
        html = items.map((it, i) => renderOnboardStep(it, i)).join('');
        break;
      case 'onboard-tab':
        html = items.map((label, i) => renderOnboardTab(label, i)).join('');
        break;
      case 'process-req':
        html = items.map(renderProcessReq).join('');
        break;
      case 'sol-chip':
        html = items.map((label) => `<span class="fs-sol-chip">${escapeHtml(label)}</span>`).join('');
        break;
      default:
        html = items.map(renderMember).join('');
    }
    $el.html(html);
  });
}

function applyBlocks($, content) {
  $('[data-cms-block]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-block');
    const block = getAt(content, key);
    if (!block) return;
    if (Array.isArray(block.sections)) {
      $el.html(renderLegalSections(block.sections));
    }
  });
}

async function applyScriptPatches(filePath, content) {
  const base = path.basename(filePath);
  if (base !== 'factoring.html') return;
  let src = await fs.readFile(filePath, 'utf8');
  const catalog = getAt(content, 'soluciones.catalog');
  if (Array.isArray(catalog)) {
    const solCatalog = catalog.map(({ pain, title, body }) => ({ pain, title, body }));
    src = src.replace(/solCatalog\s*=\s*\[[\s\S]*?\];/, `solCatalog = ${JSON.stringify(solCatalog, null, 2)};`);
  }
  const steps = getAt(content, 'home.como.steps');
  if (Array.isArray(steps)) {
    const wfDetail = steps.map((s) => ({
      title: s.title,
      body: s.bodyLong || s.body,
    }));
    src = src.replace(/wfDetail\s*=\s*\[[\s\S]*?\];/, `wfDetail = ${JSON.stringify(wfDetail, null, 2)};`);
  }
  const storyBeats = getAt(content, 'home.processModal.storyBeats');
  if (Array.isArray(storyBeats)) {
    src = src.replace(/storyBeats\s*=\s*\[[\s\S]*?\];/, `storyBeats = ${JSON.stringify(storyBeats, null, 2)};`);
  }
  const storyMs = getAt(content, 'home.processModal.storyBeatIntervalMs');
  if (typeof storyMs === 'number' && storyMs >= 800) {
    src = src.replace(/storyBeatIntervalMs\s*=\s*\d+/, `storyBeatIntervalMs = ${storyMs}`);
  }
  await fs.writeFile(filePath, src, 'utf8');
}

async function applyFile(filePath, content) {
  const html = await fs.readFile(filePath, 'utf8');
  const hadDoctype = /^\s*<!doctype/i.test(html);
  const $ = cheerio.load(html, { decodeEntities: false });
  applyHrefFrom($, content);
  applyFields($, content);
  applyLists($, content);
  applyBlocks($, content);
  let out = $.html();
  if (hadDoctype && !/^\s*<!doctype/i.test(out)) {
    out = `<!DOCTYPE html>\n${out}`;
  }
  await fs.writeFile(filePath, out, 'utf8');
  await applyScriptPatches(filePath, content);
}

async function main() {
  const content = await loadContent();
  const files = await collectHtmlFiles(TARGET_DIR);
  for (const f of files) {
    await applyFile(f, content);
  }
  console.log(`cms:apply → ${files.length} archivos en ${TARGET_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
