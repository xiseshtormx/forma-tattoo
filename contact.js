import { works as sourceWorks, processPhotos } from './data.js';
const printIds = [...document.querySelectorAll('.work-print[data-id]')].map(print => print.dataset.id);
const works = printIds.length ? printIds.map(id => sourceWorks.find(work => work.id === id)).filter(Boolean) : sourceWorks;

const viewer = document.querySelector('#viewer');
const body = document.querySelector('#dialog-body');
const kindLabel = document.querySelector('#dialog-kind');
const menu = document.querySelector('#mobile-nav');
const menuToggle = document.querySelector('.menu-toggle');
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

let dialogKind = '';
let currentWork = 0;
let returnFocus = null;
let formDraft = null;
let messageText = '';

function closeMenu(restoreFocus = false) {
  if (!menu || !menuToggle) return;
  menu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
  if (restoreFocus) menuToggle.focus({ preventScroll: true });
}

function openDialog(kind, content, opener) {
  if (!viewer || !body || !kindLabel) return;
  const opening = !viewer.open;
  if (opening) {
    const active = opener || document.activeElement;
    returnFocus = menu?.contains(active) ? menuToggle : active;
  }
  closeMenu();
  dialogKind = kind;
  kindLabel.textContent = {
    work: 'ФОТОГРАФИЯ',
    inquiry: 'ОБСУДИТЬ ИДЕЮ',
    about: 'О ПРОЕКТЕ'
  }[kind];
  body.innerHTML = content;
  viewer.setAttribute('aria-labelledby', 'dialog-title');
  if (opening) viewer.showModal();
  viewer.scrollTop = 0;
  const title = body.querySelector('#dialog-title');
  if (title) {
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }
}

function openWork(id, opener, navigationAction) {
  const index = works.findIndex(work => work.id === id);
  if (index === -1) return;
  currentWork = index;
  const work = works[index];
  openDialog('work', `
    <div class="work-view">
      <figure><img src="${escapeHTML(work.file)}" width="934" height="1400" alt="${escapeHTML(work.alt)}"></figure>
      <div class="work-description">
        <span class="eyebrow">${escapeHTML(work.style)}</span>
        <h2 id="dialog-title">${escapeHTML(work.title)}</h2>
        <p>${escapeHTML(work.description)}</p>
        <div class="source-credit">
          Фото: ${escapeHTML(work.author)}
          <a href="${escapeHTML(work.source)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>
          <small>${escapeHTML(work.license)}. Фотография для демонстрации, не работа студии «Форма».</small>
        </div>
        <div class="work-actions"><button type="button" class="button" data-action="inquiry">Обсудить свою идею</button></div>
      </div>
    </div>
    <nav class="gallery-navigation" aria-label="Просмотр фотографий">
      <button type="button" data-action="prev">Предыдущее фото</button>
      <span aria-label="Фотография ${index + 1} из ${works.length}">${String(index + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}</span>
      <button type="button" data-action="next">Следующее фото</button>
    </nav>
  `, opener);
  if (navigationAction) {
    body.querySelector(`[data-action="${navigationAction}"]`)?.focus({ preventScroll: true });
  }
}

function movePhoto(direction) {
  if (dialogKind !== 'work' || !works.length) return;
  const index = (currentWork + direction + works.length) % works.length;
  openWork(works[index].id, null, direction < 0 ? 'prev' : 'next');
}

function openInquiry(opener, draft = null) {
  openDialog('inquiry', `
    <div class="inquiry">
      <span class="eyebrow">НАЧНЁМ С РАЗГОВОРА</span>
      <h2 id="dialog-title">Что хочешь набить?</h2>
      <p>Расскажи о рисунке, месте на теле или просто о том, что тебе нравится.</p>
      <form id="inquiry-form" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="inquiry-name">Имя</label>
            <input id="inquiry-name" name="name" required autocomplete="given-name" maxlength="80" placeholder="Как к тебе обращаться" aria-describedby="inquiry-name-error">
            <span class="field-error" id="inquiry-name-error"></span>
          </div>
          <div class="field">
            <label for="inquiry-contact">Контакт</label>
            <input id="inquiry-contact" name="contact" required autocomplete="off" maxlength="160" placeholder="Телефон, @telegram или почта" aria-describedby="inquiry-contact-error">
            <span class="field-error" id="inquiry-contact-error"></span>
          </div>
          <div class="field wide">
            <label for="inquiry-idea">Идея</label>
            <textarea id="inquiry-idea" name="idea" required maxlength="1600" placeholder="Есть задумка или пока только настроение? Напиши, что у тебя в голове." aria-describedby="inquiry-idea-error"></textarea>
            <span class="field-error" id="inquiry-idea-error"></span>
          </div>
        </div>
        <p class="form-note">Демонстрация формы: она подготовит текст для копирования. Реальные контакты студии пока не подключены. Отправки сообщения и записи на сеанс нет.</p>
        <button type="submit" class="button form-submit">Подготовить сообщение</button>
      </form>
    </div>
  `, opener);
  if (draft) {
    const form = body.querySelector('#inquiry-form');
    for (const name of ['name', 'contact', 'idea']) form.elements[name].value = draft[name] || '';
  }
}

function submitInquiry(form) {
  const data = Object.fromEntries(new FormData(form));
  for (const name of ['name', 'contact', 'idea']) data[name] = String(data[name] || '').trim();
  const errors = {
    name: data.name ? '' : 'Напиши, как к тебе обращаться.',
    contact: data.contact.length >= 3 ? '' : 'Оставь телефон, почту или имя в мессенджере.',
    idea: data.idea ? '' : 'Расскажи немного о своей идее.'
  };
  let firstInvalid = null;
  for (const [name, error] of Object.entries(errors)) {
    const field = form.elements[name];
    body.querySelector(`#inquiry-${name}-error`).textContent = error;
    field.setAttribute('aria-invalid', String(Boolean(error)));
    if (error && !firstInvalid) firstInvalid = field;
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }
  formDraft = data;
  messageText = `Хочу обсудить татуировку.\n\nИмя: ${data.name}\nКонтакт: ${data.contact}\n\nИдея: ${data.idea}`;
  openDialog('inquiry', `
    <div class="inquiry">
      <span class="eyebrow">ТВОЯ ИДЕЯ</span>
      <h2 id="dialog-title">Проверь сообщение</h2>
      <p>Текст подготовлен. Его можно скопировать. Сообщение пока никому не отправлено.</p>
      <div class="review-body" id="message-preview" tabindex="0" aria-label="Подготовленный текст">${escapeHTML(messageText)}</div>
      <div class="success-actions">
        <button type="button" class="button" data-action="copy-inquiry">Скопировать текст</button>
        <button type="button" class="button secondary" data-action="edit-inquiry">Изменить</button>
      </div>
      <p id="copy-status" class="form-note" role="status" aria-live="polite"></p>
    </div>
  `);
}

async function copyInquiry() {
  const status = body.querySelector('#copy-status');
  if (!status) return;
  try {
    await navigator.clipboard.writeText(messageText);
    if (status.isConnected) status.textContent = 'Текст скопирован.';
  } catch {
    const preview = body.querySelector('#message-preview');
    if (!preview || !status.isConnected) return;
    const range = document.createRange();
    range.selectNodeContents(preview);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    preview.focus({ preventScroll: true });
    status.textContent = 'Текст выделен. Скопируй его через меню браузера или сочетанием клавиш.';
  }
}

function openAbout(opener) {
  openDialog('about', `
    <div class="about-view">
      <span class="eyebrow">ФОРМА / КОНЦЕПТ САЙТА</span>
      <h2 id="dialog-title">О проекте и фотографиях</h2>
      <p>«Форма» — демонстрационный образ тату-студии. Реальная студия и её команда пока не выбраны. Здесь нет подтверждённого адреса, цен и записи на сеанс.</p>
      <p>В подборке и сцене процесса использованы настоящие фотографии из открытых фотобанков. Они показывают характер проекта и не являются портфолио «Формы». Люди и студии на снимках с проектом не связаны. Ниже указаны фотографы, а не авторы татуировок.</p>
      <h3>Главный арт-образ</h3><p>Татуированная фигура на первом экране создана с помощью ImageGen для художественного коллажа. Это концептуальное изображение, а не фотография работы студии.</p>
      <div class="photo-source-list">${[...works, ...processPhotos].map(photo => `
        <div>
          <a href="${escapeHTML(photo.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(photo.author)}</a>
          <small>${escapeHTML(photo.title || photo.description)}<br>${escapeHTML(photo.license)}</small>
        </div>
      `).join('')}</div>
      <h3>Обсуждение идеи</h3>
      <p>Форма помогает подготовить текст для копирования. Она не отправляет сообщения и не создаёт запись на сеанс. Контакты реальной студии пока не подключены.</p>
    </div>
  `, opener);
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'close': viewer?.close(); break;
    case 'work': openWork(button.dataset.id, button); break;
    case 'prev': movePhoto(-1); break;
    case 'next': movePhoto(1); break;
    case 'inquiry': openInquiry(button); break;
    case 'about': openAbout(button); break;
    case 'copy-inquiry': void copyInquiry(); break;
    case 'edit-inquiry': openInquiry(null, formDraft); break;
  }
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'inquiry-form') return;
  event.preventDefault();
  submitInquiry(event.target);
});

document.addEventListener('input', event => {
  if (!event.target.matches('#inquiry-form input, #inquiry-form textarea')) return;
  event.target.removeAttribute('aria-invalid');
  const error = body.querySelector(`#inquiry-${event.target.name}-error`);
  if (error) error.textContent = '';
});

document.addEventListener('keydown', event => {
  if (viewer?.open && dialogKind === 'work' && !event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
    }
  } else if (event.key === 'Escape' && menu && !menu.hidden && !viewer?.open) {
    closeMenu(true);
  }
});

viewer?.addEventListener('close', () => {
  dialogKind = '';
  body.innerHTML = '';
  formDraft = null;
  messageText = '';
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
});

viewer?.addEventListener('click', event => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
});

menuToggle?.addEventListener('click', () => {
  if (!menu) return;
  const opening = menu.hidden;
  menu.hidden = !opening;
  menuToggle.setAttribute('aria-expanded', String(opening));
  menuToggle.setAttribute('aria-label', opening ? 'Закрыть меню' : 'Открыть меню');
});

menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
