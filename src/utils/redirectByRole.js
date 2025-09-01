
export function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '/admin/dashboard';
  } else {
    window.location.href = '/dashboard';
  }
}
