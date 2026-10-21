/** Editores dinámicos del CMS (equipo, catálogo, pilares). */
(function () {
  const ICONS = ['invoice', 'briefcase', 'card', 'file', 'sync'];
  const PILLARS = ['bolt', 'users', 'chart', 'monitor', 'lock', 'award'];

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') n.className = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
        else n.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      n.append(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function field(label, input) {
    return el('label', null, [label, input]);
  }

  function textInput(value, onInput) {
    const i = el('input', { type: 'text', value: value || '' });
    i.addEventListener('input', () => onInput(i.value));
    return i;
  }

  function areaInput(value, onInput) {
    const i = el('textarea', null);
    i.value = value || '';
    i.addEventListener('input', () => onInput(i.value));
    return i;
  }

  async function uploadPhoto(file, api, scope = 'equipo') {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataBase64 = btoa(binary);
    const { ok, data } = await api('/api/cms/upload', {
      method: 'POST',
      body: JSON.stringify({
        dataBase64,
        contentType: file.type,
        filename: file.name.replace(/\.[^.]+$/, ''),
        scope,
      }),
    });
    if (!ok) throw new Error(data.message || 'Error al subir');
    return scope === 'equipo' ? data.photo : { url: data.url };
  }

  function linesToParas(text) {
    return String(text || '')
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function linesToList(text) {
    return String(text || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function renderLegalSection(sec, index, onChange, onRemove) {
    const wrap = el('div', { className: 'member' });
    wrap.append(el('h4', null, [`Sección ${index + 1}${sec.title ? `: ${sec.title}` : ''}`]));
    wrap.append(
      field(
        'Título (opcional)',
        textInput(sec.title || '', (v) => onChange({ ...sec, title: v || undefined })),
      ),
    );
    wrap.append(
      field(
        'Párrafos (separados por línea en blanco)',
        areaInput((sec.paragraphs || []).join('\n\n'), (v) =>
          onChange({ ...sec, paragraphs: linesToParas(v) }),
        ),
      ),
    );
    wrap.append(
      field(
        'Viñetas (una por línea; HTML permitido)',
        areaInput((sec.list || []).join('\n'), (v) => onChange({ ...sec, list: linesToList(v) })),
      ),
    );
    wrap.append(
      field(
        'Párrafos finales (tras la lista)',
        areaInput((sec.paragraphsAfter || []).join('\n\n'), (v) =>
          onChange({ ...sec, paragraphsAfter: linesToParas(v) }),
        ),
      ),
    );
    wrap.append(el('button', { type: 'button', className: 'btn btn-ghost', onclick: onRemove }, ['Eliminar sección']));
    return wrap;
  }

  function renderMemberEditor(member, onChange, onRemove, api) {
    const wrap = el('div', { className: 'member' });
    wrap.append(el('h4', null, [member.name || 'Nuevo miembro']));
    const name = textInput(member.name, (v) => onChange({ ...member, name: v }));
    const role = textInput(member.role, (v) => onChange({ ...member, role: v }));
    wrap.append(field('Nombre', name), field('Cargo', role));

    const photoUrl = member.photo?.jpg || member.photo?.webp || '';
    const photoPreview = el('img', {
      src: photoUrl || '/assets/equipo/ignacio-prado.jpg',
      alt: '',
      style: 'width:72px;height:72px;border-radius:50%;object-fit:cover;margin:8px 0;display:block',
    });
    wrap.append(photoPreview);

    const fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try {
        const photo = await uploadPhoto(f, api);
        onChange({ ...member, photo, initials: undefined });
        photoPreview.src = photo.jpg;
      } catch (e) {
        alert(e.message || 'No se pudo subir la foto');
      }
      fileInput.value = '';
    });
    wrap.append(field('Foto (JPG/PNG/WebP)', fileInput));

    const initials = textInput(member.initials || '', (v) =>
      onChange({ ...member, initials: v || undefined, photo: v ? undefined : member.photo }),
    );
    wrap.append(field('Iniciales (si no hay foto)', initials));

    wrap.append(
      el('button', { type: 'button', className: 'btn btn-ghost', onclick: onRemove }, ['Eliminar']),
    );
    return wrap;
  }

  function renderCatalogItem(item, index, onChange, onRemove) {
    const wrap = el('div', { className: 'member' });
    wrap.append(el('h4', null, [`Solución ${index + 1}: ${item.title || ''}`]));
    const icon = el('select');
    ICONS.forEach((ic) => {
      const o = el('option', { value: ic }, [ic]);
      if (item.icon === ic) o.selected = true;
      icon.append(o);
    });
    icon.addEventListener('change', () => onChange({ ...item, icon: icon.value }));
    wrap.append(field('Icono', icon));
    wrap.append(field('Dolor (cita)', areaInput(item.pain, (v) => onChange({ ...item, pain: v }))));
    wrap.append(field('Título', textInput(item.title, (v) => onChange({ ...item, title: v }))));
    wrap.append(field('Resumen (home)', areaInput(item.summary, (v) => onChange({ ...item, summary: v }))));
    wrap.append(field('Descripción (página)', areaInput(item.body, (v) => onChange({ ...item, body: v }))));
    wrap.append(el('button', { type: 'button', className: 'btn btn-ghost', onclick: onRemove }, ['Eliminar']));
    return wrap;
  }

  function renderPilar(item, index, onChange) {
    const wrap = el('div', { className: 'member' });
    wrap.append(el('h4', null, [`Pilar ${index + 1}`]));
    const icon = el('select');
    PILLARS.forEach((ic) => {
      const o = el('option', { value: ic }, [ic]);
      if (item.icon === ic) o.selected = true;
      icon.append(o);
    });
    icon.addEventListener('change', () => onChange({ ...item, icon: icon.value }));
    wrap.append(field('Icono', icon));
    wrap.append(field('Título', textInput(item.title, (v) => onChange({ ...item, title: v }))));
    wrap.append(field('Texto', areaInput(item.body, (v) => onChange({ ...item, body: v }))));
    return wrap;
  }

  function listEditor(container, items, renderItem, onUpdate) {
    container.innerHTML = '';
    items.forEach((item, i) => {
      container.append(
        renderItem(
          item,
          i,
          (next) => {
            items[i] = next;
            onUpdate(items);
          },
          () => {
            items.splice(i, 1);
            onUpdate(items);
            listEditor(container, items, renderItem, onUpdate);
          },
          arguments[3],
        ),
      );
    });
  }

  window.CmsEditors = {
    content: null,
    api: null,

    init(content, api) {
      this.content = content;
      this.api = api;
      this.renderTeam('directorsList', 'equipo.directors');
      this.renderTeam('leadersList', 'equipo.leaders');
      this.renderCatalog();
      this.renderPilares();
      this.renderSteps();
      this.renderProcess();
      this.renderLegal('privacidad', 'legalPrivacidadList', 'addLegalPrivacidad');
      this.renderLegal('terminos', 'legalTerminosList', 'addLegalTerminos');
    },

    path(key) {
      return key.split('.').reduce((a, k) => a?.[k], this.content);
    },

    setPath(key, val) {
      const parts = key.split('.');
      let cur = this.content;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },

    renderTeam(containerId, pathKey) {
      const box = document.getElementById(containerId);
      if (!box) return;
      let items = this.path(pathKey) || [];
      const redraw = () => {
        box.innerHTML = '';
        items.forEach((member, i) => {
          box.append(
            renderMemberEditor(
              member,
              (next) => {
                items[i] = next;
                this.setPath(pathKey, items);
                redraw();
              },
              () => {
                items.splice(i, 1);
                this.setPath(pathKey, items);
                redraw();
              },
              this.api,
            ),
          );
        });
      };
      redraw();
      const addBtn = document.querySelector(`[data-add-team="${pathKey}"]`);
      if (addBtn) {
        addBtn.onclick = () => {
          items.push({ name: '', role: '', initials: '??' });
          this.setPath(pathKey, items);
          redraw();
        };
      }
    },

    renderCatalog() {
      const box = document.getElementById('catalogList');
      if (!box) return;
      let items = this.path('soluciones.catalog') || [];
      const redraw = () => {
        box.innerHTML = '';
        items.forEach((item, i) => {
          box.append(
            renderCatalogItem(
              item,
              i,
              (next) => {
                items[i] = next;
                this.setPath('soluciones.catalog', items);
              },
              () => {
                items.splice(i, 1);
                this.setPath('soluciones.catalog', items);
                redraw();
              },
            ),
          );
        });
      };
      redraw();
      const add = document.getElementById('addCatalog');
      if (add) add.onclick = () => {
        items.push({ icon: 'invoice', pain: '', title: '', summary: '', body: '' });
        this.setPath('soluciones.catalog', items);
        redraw();
      };
    },

    renderPilares() {
      const box = document.getElementById('pilaresList');
      if (!box) return;
      let items = this.path('home.pilares') || [];
      box.innerHTML = '';
      items.forEach((item, i) => {
        box.append(
          renderPilar(item, i, (next) => {
            items[i] = next;
            this.setPath('home.pilares', items);
          }),
        );
      });
    },

    renderSteps() {
      const box = document.getElementById('stepsList');
      if (!box) return;
      let items = this.path('home.como.steps') || [];
      const redraw = () => {
        box.innerHTML = '';
        items.forEach((step, i) => {
          const wrap = el('div', { className: 'member' });
          wrap.append(el('h4', null, [`Paso ${i + 1}`]));
          wrap.append(field('Título', textInput(step.title, (v) => { items[i] = { ...step, title: v }; this.setPath('home.como.steps', items); })));
          wrap.append(field('Texto (timeline)', areaInput(step.body, (v) => { items[i] = { ...step, body: v }; this.setPath('home.como.steps', items); })));
          wrap.append(field('Texto modal (simulador, opcional)', areaInput(step.bodyLong || '', (v) => { items[i] = { ...step, bodyLong: v || undefined }; this.setPath('home.como.steps', items); })));
          box.append(wrap);
        });
      };
      redraw();
    },

    renderProcess() {
      const beatsBox = document.getElementById('processStoryBeatsList');
      if (beatsBox) {
        let beats = this.path('home.processModal.storyBeats') || [];
        const redraw = () => {
          beatsBox.innerHTML = '';
          beats.forEach((beat, i) => {
            const wrap = el('div', { className: 'member' });
            wrap.append(el('h4', null, [`Fase ${i + 1}`]));
            wrap.append(field('Etiqueta', textInput(beat.label || '', (v) => {
              beats[i] = { ...beat, label: v };
              this.setPath('home.processModal.storyBeats', beats);
            })));
            wrap.append(field('Título', textInput(beat.title || '', (v) => {
              beats[i] = { ...beat, title: v };
              this.setPath('home.processModal.storyBeats', beats);
            })));
            wrap.append(field('Texto', areaInput(beat.body || '', (v) => {
              beats[i] = { ...beat, body: v };
              this.setPath('home.processModal.storyBeats', beats);
            })));
            beatsBox.append(wrap);
          });
        };
        redraw();
      }

      const actorsBox = document.getElementById('processActorsList');
      if (actorsBox) {
        let items = this.path('home.processModal.actors') || [];
        const redraw = () => {
          actorsBox.innerHTML = '';
          items.forEach((item, i) => {
            const wrap = el('div', { className: 'member' });
            wrap.append(el('h4', null, [`Actor ${i + 1}`]));
            wrap.append(field('Título', textInput(item.title, (v) => { items[i] = { ...item, title: v }; this.setPath('home.processModal.actors', items); })));
            wrap.append(field('Texto', areaInput(item.body, (v) => { items[i] = { ...item, body: v }; this.setPath('home.processModal.actors', items); })));
            actorsBox.append(wrap);
          });
        };
        redraw();
      }

      const onboardBox = document.getElementById('processOnboardList');
      if (onboardBox) {
        let steps = this.path('home.processModal.onboarding') || [];
        let tabs = this.path('home.processModal.onboardingTabs') || [];
        const redraw = () => {
          onboardBox.innerHTML = '';
          steps.forEach((step, i) => {
            const wrap = el('div', { className: 'member' });
            wrap.append(el('h4', null, [`Paso onboarding ${i + 1}`]));
            wrap.append(field('Pestaña', textInput(tabs[i] || '', (v) => { tabs[i] = v; this.setPath('home.processModal.onboardingTabs', tabs); })));
            wrap.append(field('Etiqueta imagen', textInput(step.stepLabel, (v) => { steps[i] = { ...step, stepLabel: v }; this.setPath('home.processModal.onboarding', steps); })));
            const img = el('img', { src: step.image || '', alt: '', style: 'width:64px;height:64px;object-fit:contain;margin:8px 0' });
            wrap.append(img);
            const fileInput = el('input', { type: 'file', accept: 'image/*' });
            fileInput.addEventListener('change', async () => {
              const f = fileInput.files?.[0];
              if (!f) return;
              try {
                const up = await uploadPhoto(f, this.api, 'onboarding');
                steps[i] = { ...step, image: up.url };
                this.setPath('home.processModal.onboarding', steps);
                redraw();
              } catch (e) {
                alert(e.message || 'Error al subir');
              }
            });
            wrap.append(field('Imagen', fileInput));
            onboardBox.append(wrap);
          });
        };
        redraw();
      }

      const reqBox = document.getElementById('processReqList');
      if (reqBox) {
        let items = this.path('home.processModal.requirements') || [];
        const redraw = () => {
          reqBox.innerHTML = '';
          items.forEach((item, i) => {
            const wrap = el('div', { className: 'member' });
            wrap.append(el('h4', null, [`Requisito ${i + 1}`]));
            wrap.append(field('Título', textInput(item.title, (v) => { items[i] = { ...item, title: v }; this.setPath('home.processModal.requirements', items); })));
            wrap.append(field('Texto', areaInput(item.body, (v) => { items[i] = { ...item, body: v }; this.setPath('home.processModal.requirements', items); })));
            const fileInput = el('input', { type: 'file', accept: 'image/*' });
            fileInput.addEventListener('change', async () => {
              const f = fileInput.files?.[0];
              if (!f) return;
              try {
                const up = await uploadPhoto(f, this.api, 'requisitos');
                items[i] = { ...item, icon: up.url };
                this.setPath('home.processModal.requirements', items);
                redraw();
              } catch (e) {
                alert(e.message || 'Error al subir');
              }
            });
            wrap.append(field('Icono', fileInput));
            reqBox.append(wrap);
          });
        };
        redraw();
      }
    },

    renderLegal(doc, listId, addId) {
      const box = document.getElementById(listId);
      if (!box) return;
      const pathKey = `legal.${doc}.sections`;
      let sections = this.path(pathKey) || [];
      const redraw = () => {
        box.innerHTML = '';
        sections.forEach((sec, i) => {
          box.append(
            renderLegalSection(
              sec,
              i,
              (next) => {
                sections[i] = next;
                this.setPath(pathKey, sections);
              },
              () => {
                sections.splice(i, 1);
                this.setPath(pathKey, sections);
                redraw();
              },
            ),
          );
        });
      };
      redraw();
      const addBtn = document.getElementById(addId);
      if (addBtn) {
        addBtn.onclick = () => {
          sections.push({ paragraphs: [''] });
          this.setPath(pathKey, sections);
          redraw();
        };
      }
    },

    sync() {
      /* content object already mutated in place */
    },
  };
})();
