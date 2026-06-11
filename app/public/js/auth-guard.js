(function() {
  document.documentElement.style.visibility = 'hidden';
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('/pages/login.html');
    return;
  }
  fetch('/api/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => {
    if (!res.ok) throw new Error('Token invalide');
    document.documentElement.style.visibility = '';
  })
  .catch(() => {
    localStorage.removeItem('token');
    window.location.replace('/pages/login.html');
  });
})();