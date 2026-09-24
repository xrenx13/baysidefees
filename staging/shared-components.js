/* Shared header/footer for the five secondary pages only. The homepage is unchanged. */
(async function () {
  async function insert(id, file) {
    const target = document.getElementById(id);
    const response = await fetch(file);
    if (!response.ok) throw new Error('Could not load ' + file);
    target.innerHTML = await response.text();
  }
  try {
    await Promise.all([insert('shared-header', 'shared-header.html'), insert('shared-footer', 'shared-footer.html')]);
    const nav = document.querySelector('#shared-header .bayside-original-nav');
    const menu = document.getElementById('mobile-menu');
    const button = document.getElementById('hamburger');
    const updateHeight = () => document.documentElement.style.setProperty('--shared-nav-height', nav.offsetHeight + 'px');
    updateHeight();
    window.addEventListener('resize', updateHeight);
    button.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      button.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
    button.setAttribute('aria-expanded', 'false');
    const year = document.getElementById('copy-year');
    if (year) year.textContent = new Date().getFullYear();
  } catch (error) { console.error('Shared site components failed to load:', error); }
})();
