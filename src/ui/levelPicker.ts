export type LevelPickerOptions = {
  levelIds: number[];
  currentLevel: number;
  highestUnlocked: number;
  onSelect: (levelId: number) => void;
  onClose: () => void;
};

export function openLevelPicker(options: LevelPickerOptions): void {
  const existing = document.getElementById('level-picker');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'level-picker';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'level-picker-title');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const title = document.createElement('h2');
  title.id = 'level-picker-title';
  title.className = 'modal-title';
  title.textContent = 'Choose level';

  const grid = document.createElement('div');
  grid.className = 'level-grid';
  grid.setAttribute('role', 'listbox');
  grid.setAttribute('aria-label', 'Levels');

  for (const id of options.levelIds) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-cell';
    btn.textContent = String(id);
    btn.setAttribute('role', 'option');
    btn.dataset.levelId = String(id);

    const locked = id > options.highestUnlocked;
    const current = id === options.currentLevel;
    if (locked) {
      btn.disabled = true;
      btn.setAttribute('aria-label', `Level ${id}, locked`);
    } else {
      btn.setAttribute('aria-label', `Level ${id}${current ? ', current' : ''}`);
    }
    if (current) btn.classList.add('level-cell-current');

    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        options.onSelect(id);
        options.onClose();
      }
    });
    grid.appendChild(btn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn modal-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', options.onClose);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) options.onClose();
  });

  panel.append(title, grid, closeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  closeBtn.focus();
}

export function closeLevelPicker(): void {
  document.getElementById('level-picker')?.remove();
}
