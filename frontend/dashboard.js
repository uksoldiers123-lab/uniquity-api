async function fetchData() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    // Fetch overview data
    const overviewResponse = await fetch('/api/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { totalRevenue, totalPayments, activeCustomers } = await overviewResponse.json();
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-payments').textContent = totalPayments;
    document.getElementById('active-customers').textContent = activeCustomers;

    // Fetch payments data
    const paymentsResponse = await fetch('/api/payments', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { payments } = await paymentsResponse.json();
    const paymentsTableBody = document.getElementById('payments-table-body');
    paymentsTableBody.innerHTML = payments
      .map(
        (payment) => `
        <tr>
          <td>${payment.id}</td>
          <td>$${(payment.amount / 100).toFixed(2)}</td>
          <td>${payment.status}</td>
          <td>${new Date(payment.created_at).toLocaleDateString()}</td>
        </tr>
      `
      )
      .join('');

    // Fetch customers data
    const customersResponse = await fetch('/api/customers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { customers } = await customersResponse.json();
    const customersTableBody = document.getElementById('customers-table-body');
    customersTableBody.innerHTML = customers
      .map(
        (customer) => `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.email}</td>
          <td>${new Date(customer.join_date).toLocaleDateString()}</td>
        </tr>
      `
      )
      .join('');
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Logout
document.querySelector('.logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
});

// Load data on page load
fetchData();
