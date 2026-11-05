// Compact HUD menus keep the original controls and their event handlers.
(() => {
  const menus = [...document.querySelectorAll('.compact-menu')];
  const close = (except) => menus.forEach(menu => { if (menu !== except) menu.open = false; });
  menus.forEach(menu => {
    const summary = menu.querySelector('summary');
    summary.setAttribute('aria-expanded', 'false');
    menu.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(menu.open));
      if (menu.open) close(menu);
    });
    menu.addEventListener('click', event => {
      if (event.target.closest('button')) menu.open = false;
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.compact-menu')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const current = menus.find(menu => menu.open);
    if (current) { close(); current.querySelector('summary').focus(); }
  });
})();
