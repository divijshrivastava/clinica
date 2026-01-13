import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface BillingSummary {
  patient_id: string;
  outstanding_invoices: number;
  total_outstanding: number;
  total_paid: number;
}

interface PatientBillingSummaryProps {
  patientId: string;
}

export default function PatientBillingSummary({ patientId }: PatientBillingSummaryProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingSummary();
  }, [patientId]);

  const fetchBillingSummary = async () => {
    try {
      const response = await fetch(`/api/billing/patients/${patientId}/summary`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch billing summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Billing Summary</h3>
          <Link
            to={`/invoices?patient_id=${patientId}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All Invoices →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Outstanding */}
          <div className="border-l-4 border-red-500 pl-4">
            <div className="text-sm text-gray-600 mb-1">Outstanding Balance</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_outstanding)}
            </div>
            {summary.outstanding_invoices > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {summary.outstanding_invoices} unpaid invoice{summary.outstanding_invoices > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Total Paid */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="text-sm text-gray-600 mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_paid)}
            </div>
          </div>

          {/* Lifetime Value */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="text-sm text-gray-600 mb-1">Lifetime Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.total_paid + summary.total_outstanding)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {summary.total_outstanding > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <Link
                to={`/payments/new?patient_id=${patientId}`}
                className="flex-1 bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700"
              >
                Record Payment
              </Link>
              <Link
                to={`/invoices/new?patient_id=${patientId}`}
                className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Create Invoice
              </Link>
            </div>
          </div>
        )}

        {summary.total_outstanding === 0 && summary.total_paid > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">All invoices paid</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
