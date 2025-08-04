/* lang.js
 * Handles language selection and translation of static text on the website.
 */
document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('lang') || 'pt';
  const ptBtn = document.getElementById('lang-pt');
  const enBtn = document.getElementById('lang-en');
  if (ptBtn && enBtn) {
    ptBtn.addEventListener('click', () => {
      localStorage.setItem('lang', 'pt');
      location.reload();
    });
    enBtn.addEventListener('click', () => {
      localStorage.setItem('lang', 'en');
      location.reload();
    });
  }
  translateStaticTexts(lang);
});

function translateStaticTexts(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translations = {
      'nav-home': { pt: 'Início', en: 'Home' },
      'nav-downloads': { pt: 'Downloads', en: 'Downloads' },
      'nav-panel': { pt: 'Painel', en: 'Panel' },
      'nav-terms': { pt: 'Termos', en: 'Terms' },
      'nav-contact': { pt: 'Contato', en: 'Contact' },
      'title-products': { pt: 'Produtos', en: 'Products' },
      'button-details': { pt: 'Ver detalhes', en: 'See details' },
      'group-title': { pt: 'Grupo', en: 'Group' },
      'button-buy': { pt: 'Comprar', en: 'Buy' },
      'button-download': { pt: 'Download', en: 'Download' },
      'out-of-stock': { pt: 'Produto esgotado', en: 'Out of stock' },
      'title-downloads': { pt: 'Downloads', en: 'Downloads' },
      'title-login': { pt: 'Login Administrativo', en: 'Admin Login' },
      'panel-title': { pt: 'Painel de Administração', en: 'Administration Panel' },
      'products-heading': { pt: 'Gerenciar Produtos', en: 'Manage Products' },
      'downloads-heading': { pt: 'Gerenciar Downloads', en: 'Manage Downloads' },
      'button-save-products': { pt: 'Salvar Alterações', en: 'Save Changes' },
      'button-save-downloads': { pt: 'Salvar Downloads', en: 'Save Downloads' },
      'login-user': { pt: 'Usuário', en: 'Username' },
      'login-pass': { pt: 'Senha', en: 'Password' },
      'login-submit': { pt: 'Entrar', en: 'Login' },
      'login-error': { pt: 'Usuário ou senha inválidos', en: 'Invalid username or password' }
    };
    const translation = translations[key] ? translations[key][lang] : null;
    if (translation) {
      if (el.tagName.toLowerCase() === 'input' && el.type === 'submit') {
        el.value = translation;
      } else {
        el.textContent = translation;
      }
    }
  });
