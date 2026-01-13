import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ValidationError {
  row_number: number;
  field_name: string;
  severity: 'error' | 'warning';
  error_code: string;
  error_message: string;
  suggested_fix?: string;
}

interface MigrationStatus {
  id: string;
  status: string;
  total_records: number;
  processed_records: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  errors?: ValidationError[];
}

type WizardStep = 'upload' | 'mapping' | 'validation' | 'importing' | 'complete';

export default function MigrationWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [migrationId, setMigrationId] = useState<string>('');
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const targetFields = [
    { value: 'first_name', label: 'First Name', required: true },
    { value: 'last_name', label: 'Last Name', required: false },
    { value: 'name', label: 'Full Name', required: false },
    { value: 'phone', label: 'Phone Number', required: true },
    { value: 'email', label: 'Email', required: false },
    { value: 'date_of_birth', label: 'Date of Birth', required: false },
    { value: 'dob', label: 'DOB', required: false },
    { value: 'gender', label: 'Gender', required: false },
    { value: 'blood_group', label: 'Blood Group', required: false },
    { value: 'address', label: 'Address', required: false },
    { value: 'mrn', label: 'MRN / Patient ID', required: false },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.some(ext => fileExt === ext)) {
        alert('Invalid file type. Please upload a CSV or Excel file.');
        return;
      }

      setFile(selectedFile);
      // Auto-detect columns (simplified - in production, would parse file)
      const sampleColumns = ['Patient Name', 'Phone Number', 'DOB', 'Blood Group', 'Address'];
      setDetectedColumns(sampleColumns);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      sampleColumns.forEach(col => {
        const lower = col.toLowerCase();
        if (lower.includes('name')) autoMapping[col] = 'name';
        if (lower.includes('phone')) autoMapping[col] = 'phone';
        if (lower.includes('dob') || lower.includes('birth')) autoMapping[col] = 'date_of_birth';
        if (lower.includes('blood')) autoMapping[col] = 'blood_group';
        if (lower.includes('address')) autoMapping[col] = 'address';
      });
      setColumnMapping(autoMapping);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // Create migration
      const createResponse = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entity_types: ['patient'],
        }),
      });

      const { migration_id } = await createResponse.json();
      setMigrationId(migration_id);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_types', JSON.stringify(['patient']));
      formData.append('column_mapping', JSON.stringify(columnMapping));

      const uploadResponse = await fetch(`/api/migrations/${migration_id}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (uploadResponse.ok) {
        setCurrentStep('validation');
        pollMigrationStatus(migration_id);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Migration upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pollMigrationStatus = async (id: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/migrations/${id}`, {
          credentials: 'include',
        });
        const status: MigrationStatus = await response.json();
        setMigrationStatus(status);

        if (status.status === 'validation_failed') {
          setCurrentStep('validation');
        } else if (status.status === 'importing') {
          setCurrentStep('importing');
          setTimeout(poll, 2000);
        } else if (status.status === 'completed') {
          setCurrentStep('complete');
        } else if (status.status === 'failed') {
          alert('Migration failed. Please check the errors and try again.');
        } else {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Failed to poll migration status:', error);
      }
    };

    poll();
  };

  const handleFixError = async (errorId: string, correctedValue: string) => {
    if (!migrationId) return;

    try {
      await fetch(`/api/migrations/${migrationId}/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ corrected_value: correctedValue }),
      });

      // Refresh status
      pollMigrationStatus(migrationId);
    } catch (error) {
      console.error('Failed to fix error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Patient Data</h1>
          <p className="mt-2 text-gray-600">
            Upload your existing patient records from CSV or Excel files
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['upload', 'mapping', 'validation', 'importing', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : index < ['upload', 'mapping', 'validation', 'importing', 'complete'].indexOf(currentStep)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 4 && (
                  <div
                    className={`w-20 h-1 ${
                      index < ['upload', 'mapping', 'validation', 'importing', 'complete'].indexOf(currentStep)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Upload</span>
            <span className="text-xs text-gray-600">Map</span>
            <span className="text-xs text-gray-600">Validate</span>
            <span className="text-xs text-gray-600">Import</span>
            <span className="text-xs text-gray-600">Complete</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Upload File */}
          {currentStep === 'upload' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Choose Data Source</h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV or Excel (XLSX, XLS) up to 10MB
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-6">
                  <button
                    onClick={() => setCurrentStep('mapping')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Continue to Column Mapping
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {currentStep === 'mapping' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Map Your Columns</h2>
              <p className="text-sm text-gray-600 mb-4">
                We detected {detectedColumns.length} columns. Map them to the appropriate fields:
              </p>

              <div className="space-y-3">
                {detectedColumns.map((column) => (
                  <div key={column} className="flex items-center gap-4">
                    <div className="flex-1 font-medium text-gray-700">{column}</div>
                    <div className="flex-1">
                      <select
                        value={columnMapping[column] || ''}
                        onChange={(e) =>
                          setColumnMapping({ ...columnMapping, [column]: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Not mapped</option>
                        {targetFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validation */}
          {currentStep === 'validation' && migrationStatus && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 3: Review & Fix Issues</h2>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-600 font-medium">
                    ✓ {migrationStatus.total_records - migrationStatus.error_count} valid records
                  </span>
                  {migrationStatus.error_count > 0 && (
                    <span className="text-red-600 font-medium">
                      ✗ {migrationStatus.error_count} errors
                    </span>
                  )}
                  {migrationStatus.warning_count > 0 && (
                    <span className="text-yellow-600 font-medium">
                      ⚠ {migrationStatus.warning_count} warnings
                    </span>
                  )}
                </div>
              </div>

              {migrationStatus.errors && migrationStatus.errors.length > 0 && (
                <div className="space-y-3">
                  {migrationStatus.errors.slice(0, 10).map((error, index) => (
                    <div
                      key={index}
                      className={`border ${
                        error.severity === 'error' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                      } rounded-md p-3`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium">Row {error.row_number}</span>
                          <span className="text-gray-600 ml-2">- {error.field_name}</span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            error.severity === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                          }`}
                        >
                          {error.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{error.error_message}</p>
                      {error.suggested_fix && (
                        <p className="text-sm text-blue-600 mt-1">Suggested: {error.suggested_fix}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {migrationStatus.error_count === 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => pollMigrationStatus(migrationId)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  >
                    All Good! Start Import
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {currentStep === 'importing' && migrationStatus && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Importing...</h2>

              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${(migrationStatus.processed_records / migrationStatus.total_records) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-center mt-2 text-gray-600">
                  {migrationStatus.processed_records} / {migrationStatus.total_records} records imported
                </p>
              </div>

              <p className="text-sm text-gray-600 text-center">
                You can safely leave this page. We'll notify you when the import completes.
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && migrationStatus && (
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-semibold mb-2">Import Complete!</h2>
              <p className="text-gray-600 mb-6">
                Successfully imported {migrationStatus.success_count} patient records
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/patients')}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  View Patients
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Import More Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
