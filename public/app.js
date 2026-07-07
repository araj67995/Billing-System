const API_BASE = '/api';

// Get auth token
function getToken() {
  return localStorage.getItem('token');
}

// Get authorization header
function getAuthHeader() {
  const token = getToken();
  return token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

// Check authentication
function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Display logged-in user
function displayUser() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) {
    document.getElementById('userDisplay').textContent = `Welcome, ${user.name}`;
  }
}

// State management
let customers = [];
let invoices = [];
let payments = [];
let items = [];
let invoiceItems = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!checkAuth()) return;

  displayUser();
  setupEventListeners();
  loadDashboardData();
  loadCustomers();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('customerForm').addEventListener('submit', handleAddCustomer);
  document.getElementById('itemForm').addEventListener('submit', handleAddItem);
  document.getElementById('invoiceForm').addEventListener('submit', handleCreateInvoice);
  document.getElementById('paymentForm').addEventListener('submit', handleRecordPayment);
}

// Section navigation
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');

  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'invoices') loadInvoices();
  if (sectionId === 'items') loadItems();
  if (sectionId === 'payments') loadPayments();
}

// === DASHBOARD ===
async function loadDashboardData() {
  try {
    const [customersRes, invoicesRes, paymentsRes] = await Promise.all([
      apiFetch('/customers'),
      apiFetch('/invoices'),
      apiFetch('/payments'),
    ]);

    const customersData = await customersRes.json();
    const invoicesData = await invoicesRes.json();
    const paymentsData = await paymentsRes.json();

    customers = customersData.data || [];
    invoices = invoicesData.data || [];
    payments = paymentsData.data || [];

    updateDashboard();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function updateDashboard() {
  document.getElementById('totalCustomers').textContent = customers.length;
  document.getElementById('totalInvoices').textContent = invoices.length;

  const paidCount = invoices.filter(inv => inv.status === 'paid').length;
  document.getElementById('paidInvoices').textContent = paidCount;

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  document.getElementById('pendingPayments').textContent = pendingCount;
}

function refreshDashboard() {
  loadDashboardData();
  alert('Dashboard refreshed!');
}

// Logout handler
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  }
}

// === ITEMS ===
function toggleItemForm() {
  document.getElementById('itemForm').style.display =
    document.getElementById('itemForm').style.display === 'none' ? 'block' : 'none';
}

async function loadItems() {
  try {
    const response = await apiFetch('/items');
    const data = await response.json();
    items = data.data || [];
    displayItems();
    populateItemDropdown();
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

function displayItems() {
  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.sku || '-'}</td>
      <td>${item.category || '-'}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>${item.description || '-'}</td>
      <td><span class="status ${item.status}">${item.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="editItem('${item._id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem('${item._id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function populateItemDropdown() {
  const select = document.getElementById('itemDropdown');
  select.innerHTML = '<option value="">Select an item to add</option>';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = JSON.stringify({ _id: item._id, name: item.name, price: item.price });
    option.textContent = `${item.name} - $${item.price.toFixed(2)}`;
    select.appendChild(option);
  });
}

async function handleAddItem(e) {
  e.preventDefault();

  const itemData = {
    name: document.getElementById('itemName').value.trim(),
    description: document.getElementById('itemDescription').value.trim(),
    sku: document.getElementById('itemSKU').value.trim(),
    price: parseFloat(document.getElementById('itemPrice').value),
    category: document.getElementById('itemCategory').value.trim(),
  };

  if (!itemData.description) delete itemData.description;
  if (!itemData.sku) delete itemData.sku;
  if (!itemData.category) delete itemData.category;

  try {
    const response = await apiFetch('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Item added successfully!');
      document.getElementById('itemForm').reset();
      toggleItemForm();
      loadItems();
    } else {
      alert('Error adding item: ' + (data.error || 'Unknown error'));
      console.error('Item error:', data);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

async function editItem(id) {
  const item = items.find(existingItem => existingItem._id === id);
  if (!item) {
    alert('Item not found');
    return;
  }

  const name = prompt('Item name:', item.name);
  if (name === null) return;

  const priceInput = prompt('Price:', item.price);
  if (priceInput === null) return;

  const price = parseFloat(priceInput);
  if (!name.trim() || Number.isNaN(price) || price < 0) {
    alert('Please provide a valid item name and price');
    return;
  }

  const itemData = {
    name: name.trim(),
    description: prompt('Description:', item.description || '') || '',
    sku: prompt('SKU:', item.sku || '') || '',
    category: prompt('Category:', item.category || '') || '',
    price,
  };

  if (!itemData.description.trim()) delete itemData.description;
  if (!itemData.sku.trim()) delete itemData.sku;
  if (!itemData.category.trim()) delete itemData.category;

  try {
    const response = await apiFetch(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });

    if (response.ok) {
      alert('Item updated successfully!');
      loadItems();
      loadDashboardData();
    } else {
      const data = await response.json();
      alert('Error updating item: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const response = await apiFetch(`/items/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('Item deleted successfully!');
      loadItems();
    } else {
      alert('Error deleting item');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// === CUSTOMERS ===
function toggleCustomerForm() {
  document.getElementById('customerForm').style.display =
    document.getElementById('customerForm').style.display === 'none' ? 'block' : 'none';
}

async function loadCustomers() {
  try {
    const response = await apiFetch('/customers');
    const data = await response.json();
    customers = data.data || [];
    displayCustomers();
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

function displayCustomers() {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';

  customers.forEach(customer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${customer.name}</td>
      <td>${customer.email}</td>
      <td>${customer.phone}</td>
      <td>${customer.company || '-'}</td>
      <td><span class="status ${customer.status}">${customer.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="editCustomer('${customer._id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer._id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function handleAddCustomer(e) {
  e.preventDefault();

  const customerData = {
    name: document.getElementById('customerName').value.trim(),
    email: document.getElementById('customerEmail').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    company: document.getElementById('customerCompany').value.trim(),
    address: {
      street: document.getElementById('customerAddress').value.trim(),
    },
  };

  if (!customerData.company) delete customerData.company;
  if (!customerData.address.street) delete customerData.address;

  try {
    const response = await apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });

    if (response.ok) {
      alert('Customer added successfully!');
      document.getElementById('customerForm').reset();
      toggleCustomerForm();
      loadCustomers();
      loadDashboardData();
    } else {
      alert('Error adding customer');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error adding customer: ' + error.message);
  }
}

async function editCustomer(id) {
  const customer = customers.find(existingCustomer => existingCustomer._id === id);
  if (!customer) {
    alert('Customer not found');
    return;
  }

  const name = prompt('Customer name:', customer.name);
  if (name === null) return;

  const email = prompt('Email:', customer.email);
  if (email === null) return;

  const phone = prompt('Phone:', customer.phone);
  if (phone === null) return;

  if (!name.trim() || !email.trim() || !phone.trim()) {
    alert('Name, email, and phone are required');
    return;
  }

  const address = customer.address?.street || '';
  const customerData = {
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    company: prompt('Company:', customer.company || '') || '',
    address: {
      street: prompt('Address:', address) || '',
    },
  };

  if (!customerData.company.trim()) delete customerData.company;
  if (!customerData.address.street.trim()) delete customerData.address;

  try {
    const response = await apiFetch(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });

    if (response.ok) {
      alert('Customer updated successfully!');
      loadCustomers();
      loadDashboardData();
    } else {
      const data = await response.json();
      alert('Error updating customer: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

async function deleteCustomer(id) {
  if (!confirm('Are you sure you want to delete this customer?')) return;

  try {
    const response = await apiFetch(`/customers/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('Customer deleted successfully!');
      loadCustomers();
      loadDashboardData();
    } else {
      alert('Error deleting customer');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// === INVOICES ===
function toggleInvoiceForm() {
  const form = document.getElementById('invoiceForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  
  if (form.style.display === 'block') {
    // Reset invoice items when opening form
    invoiceItems = [];
    document.getElementById('invoiceItems').innerHTML = '<div class="invoice-item-display" style="color: #999; text-align: center;"><strong>No items added yet</strong></div>';
    document.getElementById('invoiceTotal').textContent = '0.00';
    document.getElementById('invoiceForm').reset();
    
    populateCustomerDropdown();
    loadItems();
  }
}

async function loadInvoices() {
  try {
    const response = await apiFetch('/invoices');
    const data = await response.json();
    invoices = data.data || [];
    displayInvoices();
  } catch (error) {
    console.error('Error loading invoices:', error);
  }
}

function displayInvoices() {
  const tbody = document.querySelector('#invoicesTable tbody');
  tbody.innerHTML = '';

  invoices.forEach(invoice => {
    const customerName = invoice.customerId?.name || 'Unknown';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${invoice.invoiceNumber}</td>
      <td>${customerName}</td>
      <td>$${invoice.total.toFixed(2)}</td>
      <td>${new Date(invoice.issueDate).toLocaleDateString()}</td>
      <td>${new Date(invoice.dueDate).toLocaleDateString()}</td>
      <td><span class="status ${invoice.status}">${invoice.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="viewInvoice('${invoice._id}')">View</button>
        ${invoice.status !== 'paid' ? `<button class="btn btn-success btn-sm" onclick="markPaid('${invoice._id}')">Mark Paid</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice._id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function populateCustomerDropdown() {
  const select = document.getElementById('invoiceCustomer');
  select.innerHTML = '<option value="">Select Customer</option>';
  customers.forEach(customer => {
    const option = document.createElement('option');
    option.value = customer._id;
    option.textContent = customer.name;
    select.appendChild(option);
  });

  const paymentSelect = document.getElementById('paymentInvoice');
  paymentSelect.innerHTML = '<option value="">Select Invoice</option>';
  invoices.filter(inv => inv.status !== 'paid').forEach(invoice => {
    const option = document.createElement('option');
    option.value = invoice._id;
    const customerName = invoice.customerId?.name || 'Unknown';
    option.textContent = `${invoice.invoiceNumber} - ${customerName} ($${invoice.total.toFixed(2)})`;
    paymentSelect.appendChild(option);
  });
}

function addPredefinedItem() {
  const selectedValue = document.getElementById('itemDropdown').value;
  const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;

  if (!selectedValue) {
    alert('Please select an item');
    return;
  }

  const itemData = JSON.parse(selectedValue);

  invoiceItems.push({
    itemId: itemData._id,
    description: itemData.name,
    quantity: quantity,
    unitPrice: itemData.price,
    amount: quantity * itemData.price,
  });

  document.getElementById('itemDropdown').value = '';
  document.getElementById('itemQuantity').value = '1';

  displayInvoiceItems();
  calculateInvoiceTotal();
}

function addCustomItem() {
  const desc = document.getElementById('customItemDesc').value.trim();
  const qty = parseInt(document.getElementById('customItemQty').value) || 1;
  const price = parseFloat(document.getElementById('customItemPrice').value) || 0;

  if (!desc) {
    alert('Please enter item description');
    return;
  }

  if (qty <= 0 || price <= 0) {
    alert('Quantity and price must be greater than 0');
    return;
  }

  invoiceItems.push({
    description: desc,
    quantity: qty,
    unitPrice: price,
    amount: qty * price,
  });

  document.getElementById('customItemDesc').value = '';
  document.getElementById('customItemQty').value = '1';
  document.getElementById('customItemPrice').value = '';

  displayInvoiceItems();
  calculateInvoiceTotal();
}

function displayInvoiceItems() {
  const itemsContainer = document.getElementById('invoiceItems');
  
  if (invoiceItems.length === 0) {
    itemsContainer.innerHTML = '<div class="invoice-item-display" style="color: #999; text-align: center;"><strong>No items added yet</strong></div>';
    return;
  }

  itemsContainer.innerHTML = '';
  invoiceItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'invoice-item-row';
    itemDiv.innerHTML = `
      <div class="invoice-item-desc">${item.description}</div>
      <div class="invoice-item-qty">${item.quantity}</div>
      <div class="invoice-item-price">$${item.unitPrice.toFixed(2)}</div>
      <div class="invoice-item-amount">$${item.amount.toFixed(2)}</div>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceItem(${index})">Remove</button>
    `;
    itemsContainer.appendChild(itemDiv);
  });
}

function removeInvoiceItem(index) {
  invoiceItems.splice(index, 1);
  displayInvoiceItems();
  calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
  let total = 0;
  invoiceItems.forEach(item => {
    total += item.amount;
  });

  const tax = parseFloat(document.getElementById('invoiceTax').value) || 0;
  document.getElementById('invoiceTotal').textContent = (total + tax).toFixed(2);
}

// Add event listeners for invoice calculations
document.addEventListener('change', (e) => {
  if (e.target.id === 'invoiceTax') {
    calculateInvoiceTotal();
  }
});

async function handleCreateInvoice(e) {
  e.preventDefault();

  if (invoiceItems.length === 0) {
    alert('Please add at least one item to the invoice');
    return;
  }

  const customerId = document.getElementById('invoiceCustomer').value;
  const dueDate = document.getElementById('invoiceDueDate').value;

  if (!customerId) {
    alert('Please select a customer');
    return;
  }

  if (!dueDate) {
    alert('Please select a due date');
    return;
  }

  const invoiceData = {
    customerId,
    items: invoiceItems,
    tax: parseFloat(document.getElementById('invoiceTax').value) || 0,
    dueDate,
  };

  try {
    const response = await apiFetch('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Invoice created successfully!');
      document.getElementById('invoiceForm').reset();

      // Reset invoice items and state
      invoiceItems = [];
      document.getElementById('invoiceItems').innerHTML = '<div class="invoice-item-display" style="color: #999; text-align: center;"><strong>No items added yet</strong></div>';
      document.getElementById('invoiceTotal').textContent = '0.00';

      toggleInvoiceForm();
      loadInvoices();
      loadDashboardData();
    } else {
      alert('Error creating invoice: ' + (data.error || 'Unknown error'));
      console.error('Invoice creation error:', data);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

function viewInvoice(id) {
  const invoice = invoices.find(inv => inv._id === id);
  if (invoice) {
    alert(`Invoice: ${invoice.invoiceNumber}\nTotal: $${invoice.total.toFixed(2)}\nStatus: ${invoice.status}`);
  }
}

async function markPaid(id) {
  try {
    const response = await apiFetch(`/invoices/${id}/pay`, {
      method: 'PATCH',
    });

    if (response.ok) {
      alert('Invoice marked as paid!');
      loadInvoices();
      loadDashboardData();
    } else {
      alert('Error marking invoice as paid');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

async function deleteInvoice(id) {
  if (!confirm('Are you sure you want to delete this invoice?')) return;

  try {
    const response = await apiFetch(`/invoices/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('Invoice deleted successfully!');
      loadInvoices();
      loadDashboardData();
    } else {
      alert('Error deleting invoice');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// === PAYMENTS ===
function togglePaymentForm() {
  document.getElementById('paymentForm').style.display =
    document.getElementById('paymentForm').style.display === 'none' ? 'block' : 'none';
  if (document.getElementById('paymentForm').style.display === 'block') {
    loadInvoices().then(populateCustomerDropdown);
  }
}

async function loadPayments() {
  try {
    const response = await apiFetch('/payments');
    const data = await response.json();
    payments = data.data || [];
    displayPayments();
  } catch (error) {
    console.error('Error loading payments:', error);
  }
}

function displayPayments() {
  const tbody = document.querySelector('#paymentsTable tbody');
  tbody.innerHTML = '';

  payments.forEach(payment => {
    const invoiceNum = payment.invoiceId?.invoiceNumber || 'Unknown';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${payment.transactionId}</td>
      <td>${invoiceNum}</td>
      <td>$${payment.amount.toFixed(2)}</td>
      <td>${payment.paymentMethod}</td>
      <td><span class="status ${payment.status}">${payment.status}</span></td>
      <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="viewPayment('${payment._id}')">View</button>
        <button class="btn btn-danger btn-sm" onclick="deletePayment('${payment._id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function handleRecordPayment(e) {
  e.preventDefault();

  const invoiceId = document.getElementById('paymentInvoice').value;
  const selectedInvoice = invoices.find(inv => inv._id === invoiceId);
  
  if (!selectedInvoice) {
    alert('Please select a valid invoice');
    return;
  }

  const customerId = selectedInvoice.customerId?._id || selectedInvoice.customerId;
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentMethod = document.getElementById('paymentMethod').value;

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  if (!paymentMethod) {
    alert('Please select a payment method');
    return;
  }

  const paymentData = {
    invoiceId,
    customerId,
    amount,
    paymentMethod,
    notes: document.getElementById('paymentNotes').value,
  };

  try {
    const response = await apiFetch('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();
    
    if (response.ok) {
      alert('Payment recorded successfully!');
      document.getElementById('paymentForm').reset();
      togglePaymentForm();
      loadPayments();
      loadDashboardData();
    } else {
      alert('Error recording payment: ' + (data.error || 'Unknown error'));
      console.error('Payment error:', data);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

function viewPayment(id) {
  const payment = payments.find(p => p._id === id);
  if (payment) {
    alert(`Transaction: ${payment.transactionId}\nAmount: $${payment.amount.toFixed(2)}\nMethod: ${payment.paymentMethod}`);
  }
}

async function deletePayment(id) {
  if (!confirm('Are you sure you want to delete this payment?')) return;

  try {
    const response = await apiFetch(`/payments/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('Payment deleted successfully!');
      loadPayments();
      loadDashboardData();
    } else {
      alert('Error deleting payment');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}
