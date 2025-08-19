// Fetch and display data from the backend
async function fetchData() {
  try {
    // Fetch payment data
    const paymentsResponse = await fetch('/api/payments');
    const paymentsData = await paymentsResponse.json();

    // Update payments table
    const paymentsTableBody = document.getElementById('payments-table-body');
    paymentsTableBody.innerHTML = paymentsData
      .map(
        (payment) => `
        <tr>
          <td>${payment.id}</td>
          <td>$${payment.amount}</td>
          <td>${payment.status}</td>
          <td>${new Date(payment.date).toLocaleDateString()}</td>
        </tr>
      `
      )
      .join('');

    // Fetch customer data
    const customersResponse = await fetch('/api/customers');
    const customersData = await customersResponse.json();

    // Update customers table
    const customersTableBody = document.getElementById('customers-table-body');
    customersTableBody.innerHTML = customersData
      .map(
        (customer) => `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.email}</td>
          <td>${new Date(customer.joinDate).toLocaleDateString()}</td>
        </tr>
      `
      )
      .join('');

    // Update overview cards
    const totalRevenue = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-payments').textContent = paymentsData.length;
    document.getElementById('active-customers').textContent = customersData.length;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Logout functionality
document.querySelector('.logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html'; // Redirect to login page
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Fetch data on page load
document.addEventListener('DOMContentLoaded', fetchData);
