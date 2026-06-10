(function() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/pages/login.html';
  }
})();