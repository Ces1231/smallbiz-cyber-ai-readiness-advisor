// toast.js — Global Toast Notification System
// Usage: Toast.success(msg), Toast.error(msg), Toast.info(msg)
// Auto-dismisses after 3.5s. Slide-in from top-right.

const Toast = (() => {
  function _getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function _show(msg, type) {
    const container = _getContainer();
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = msg;

    const close = document.createElement('button');
    close.className = 'toast-close';
    close.innerHTML = '&times;';
    close.onclick = () => _dismiss(toast);
    toast.appendChild(close);

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    const timer = setTimeout(() => _dismiss(toast), 3500);
    toast._dismissTimer = timer;
  }

  function _dismiss(toast) {
    clearTimeout(toast._dismissTimer);
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  }

  return {
    success: (msg) => _show(msg, 'success'),
    error: (msg) => _show(msg, 'error'),
    info: (msg) => _show(msg, 'info'),
  };
})();
