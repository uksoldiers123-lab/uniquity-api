<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dashboard Login Redirect</title>
  <script>
    (async function() {
      // Read the token from the query param
      const url = new URL(window.location.href);
      const token = url.searchParams.get('token');
      if (!token) {
        window.location.href = 'https://dashboard.uniquitysolutions.com/login';
        return;
      }

      // Post to the verify endpoint on the dashboard domain
      try {
        const res = await fetch('/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (res.ok) {
          // Redirect to the user landing/dashboard
          // If your verify-token returns a user-specific route, you can use that here.
          window.location.href = 'https://dashboard.uniquitysolutions.com/';
        } else {
          window.location.href = 'https://dashboard.uniquitysolutions.com/login';
        }
      } catch (e) {
        window.location.href = 'https://dashboard.uniquitysolutions.com/login';
      }
    })();
  </script>
</head>
<body>
  Redirecting to your dashboard...
</body>
</html>
