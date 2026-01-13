import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  due_date?: string;
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statuses = [
    { value: 'all', label: 'All Invoices', color: 'gray' },
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'finalized', label: 'Finalized', color: 'blue' },
    { value: 'partially_paid', label: 'Partially Paid', color: 'yellow' },
    { value: 'paid', label: 'Paid', color: 'green' },
    { value: 'overdue', label: 'Overdue', color: 'red' },
    { value: 'cancelled', label: 'Cancelled', color: 'gray' },
  ];

  useEffect(() => {
    fetchInvoices();
  }, [selectedStatus]);

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/billing/invoices?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchTerm === '' ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${invoice.first_name} ${invoice.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.phone.includes(searchTerm);
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    const statusConfig = statuses.find((s) => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate summary stats
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
  const totalReceived = filteredInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const overdueCount = filteredInvoices.filter(inv => inv.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="mt-2 text-gray-600">Manage billing and invoices</p>
            </div>
            <Link
              to="/invoices/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Create Invoice
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Received</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Overdue</div>
            <div className="text-2xl font-bold text-orange-600">{overdueCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by invoice number, patient name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2"
              />
            </div>
            <div className="w-64">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No invoices found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const statusColor = getStatusColor(invoice.status);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(invoice.invoice_date)}</div>
                        {invoice.due_date && (
                          <div className="text-xs text-gray-500">Due: {formatDate(invoice.due_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/patients/${invoice.patient_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {invoice.first_name} {invoice.last_name}
                        </Link>
                        <div className="text-sm text-gray-500">{invoice.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600">{formatCurrency(invoice.paid_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            invoice.outstanding_amount > 0 ? 'text-red-600' : 'text-gray-500'
                          }`}
                        >
                          {formatCurrency(invoice.outstanding_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800 capitalize`}
                        >
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </Link>
                        {invoice.outstanding_amount > 0 && invoice.status !== 'cancelled' && (
                          <button className="text-green-600 hover:text-green-900">
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
