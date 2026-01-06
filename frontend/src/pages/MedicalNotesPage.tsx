import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiPlus, FiCamera, FiClipboard, FiX, FiUpload, FiImage, FiUser, FiCalendar, FiClock } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { medicalNotesApi, MedicalNote, CreateMedicalNotePayload } from '../api/medicalNotes'
import { patientsApi, Patient } from '../api/patients'
import { templatesApi, NoteTemplate } from '../api/templates'
import { useAuthStore } from '../store/authStore'
import SearchablePatientSelect from '../components/SearchablePatientSelect'

export default function MedicalNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState<MedicalNote[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [templates, setTemplates] = useState<NoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MedicalNote | null>(null)
  const [selectedNotePatient, setSelectedNotePatient] = useState<Patient | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedNoteType, setSelectedNoteType] = useState<'handwritten' | 'typed' | 'template' | 'voice'>('typed')
  const [uploadedImages, setUploadedImages] = useState<string[]>([]) // Store image data URLs
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const { user } = useAuthStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateMedicalNotePayload>({
    defaultValues: {
      note_type: 'typed',
    },
  })

  const noteType = watch('note_type')

  useEffect(() => {
    fetchNotes()
  }, [])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  useEffect(() => {
    if (showCreateModal) {
      fetchPatients()
      if (noteType === 'template') {
        fetchTemplates()
      }
    }
  }, [showCreateModal, noteType])

  useEffect(() => {
    setSelectedNoteType(noteType)
  }, [noteType])

  // Check for action=new query param
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowCreateModal(true)
      const patientId = searchParams.get('patient_id')
      if (patientId) {
        setValue('patient_id', patientId)
        reset({ patient_id: patientId, note_type: 'typed' })
      }
      searchParams.delete('action')
      searchParams.delete('patient_id')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams, reset, setValue])

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const data = await medicalNotesApi.list({ limit: 50 })
      setNotes(data.data)
    } catch (error: any) {
      toast.error('Failed to load notes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await patientsApi.list({ limit: 100 })
      setPatients(data.data)
    } catch (error) {
      toast.error('Failed to load patients')
      console.error(error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const data = await templatesApi.list({ is_active: true })
      setTemplates(data.data)
    } catch (error) {
      console.error('Failed to load templates:', error)
      // Don't show error toast - templates are optional
    }
  }

  const handleTemplateSelect = (template: NoteTemplate) => {
    setValue('template_id', template.id)
    // Auto-fill title and content from template
    if (template.template_content) {
      if (template.template_content.title) {
        setValue('title', template.template_content.title)
      }
      if (template.template_content.content) {
        setValue('content', template.template_content.content)
      }
    }
  }

  const onSubmitCreate = async (data: CreateMedicalNotePayload) => {
    if (!data.patient_id) {
      toast.error('Patient is required')
      return
    }

    // Use uploadedImages state directly (prioritize over form data)
    const imageUrls = uploadedImages.length > 0 ? uploadedImages : (data.image_urls || [])
    
    // Validate handwritten notes have images
    if (data.note_type === 'handwritten' && imageUrls.length === 0) {
      toast.error('At least one image is required for handwritten notes')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateMedicalNotePayload = {
        ...data,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      }
      
      console.log('Submitting note payload:', {
        note_type: payload.note_type,
        image_urls_count: payload.image_urls?.length || 0,
        uploadedImages_count: uploadedImages.length,
        patient_id: payload.patient_id
      })
      
      const result = await medicalNotesApi.create(payload)
      
      // Optimistically add the note to the list
      const optimisticNote: MedicalNote = {
        id: result.aggregate_id,
        hospital_id: user?.hospital_id || '',
        patient_id: data.patient_id,
        visit_id: data.visit_id,
        note_type: payload.note_type,
        title: payload.title,
        content: payload.content,
        image_urls: payload.image_urls,
        audio_url: data.audio_url,
        template_id: data.template_id,
        is_signed: false,
        current_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      setNotes(prev => [optimisticNote, ...prev])
      toast.success('Note created successfully!')
      setShowCreateModal(false)
      setUploadedImages([])
      reset()

      // Fetch in background to sync with projection
      setTimeout(() => {
        fetchNotes()
      }, 1000)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create note')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.9)
        
        // Stop camera stream
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop())
          setCameraStream(null)
        }
        
        // Add image to uploaded images (append if modal is already open, replace if not)
        if (showCreateModal) {
          // Modal is already open, just add the image
          setUploadedImages(prev => {
            const newImages = [...prev, imageData]
            setValue('image_urls', newImages)
            return newImages
          })
        } else {
          // Modal is not open, set image and open modal
          setUploadedImages([imageData])
          setShowCreateModal(true)
          setValue('note_type', 'handwritten')
          setValue('image_urls', [imageData])
          fetchPatients() // Ensure patients are loaded
        }
        setShowCamera(false)
      }
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStream(stream)
        setShowCamera(true)
        setShowUploadOptions(false)
      }
    } catch (error) {
      toast.error('Failed to access camera')
      console.error(error)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image file is too large. Maximum size is 10MB.')
        return
      }
      
      // Handle file upload
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageData = reader.result as string
        
        // Add image to uploaded images (append if modal is already open, replace if not)
        if (showCreateModal) {
          // Modal is already open, just add the image
          setUploadedImages(prev => {
            const newImages = [...prev, imageData]
            setValue('image_urls', newImages)
            return newImages
          })
        } else {
          // Modal is not open, set image and open modal
          setUploadedImages([imageData])
          setShowCreateModal(true)
          setValue('note_type', 'handwritten')
          setValue('image_urls', [imageData])
          fetchPatients() // Ensure patients are loaded
        }
        setShowUploadOptions(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read image file')
      }
      reader.readAsDataURL(file)
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadFromFile = () => {
    fileInputRef.current?.click()
    setShowUploadOptions(false)
  }

  const handleNoteClick = async (note: MedicalNote) => {
    setSelectedNote(note)
    setShowDetailModal(true)
    setLoadingDetail(true)
    
    try {
      // Fetch full note details
      const fullNote = await medicalNotesApi.get(note.id)
      setSelectedNote(fullNote)
      
      // Fetch patient details if available
      if (fullNote.patient_id) {
        try {
          const patient = await patientsApi.get(fullNote.patient_id)
          setSelectedNotePatient(patient)
        } catch (error) {
          console.error('Failed to load patient details:', error)
        }
      }
    } catch (error: any) {
      toast.error('Failed to load note details')
      console.error(error)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Notes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Handwritten notes, typed notes, and templates
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowUploadOptions(!showUploadOptions)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiUpload className="mr-2 h-5 w-5" />
              Upload Image
            </button>
            
            {/* Upload Options Dropdown */}
            {showUploadOptions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUploadOptions(false)}
                />
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={startCamera}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FiCamera className="mr-3 h-5 w-5" />
                      Open Camera
                    </button>
                    <button
                      onClick={handleUploadFromFile}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FiImage className="mr-3 h-5 w-5" />
                      Upload from File
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <button
            onClick={() => {
              setUploadedImages([])
              reset({ note_type: 'typed' })
              setShowCreateModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <FiPlus className="mr-2 h-5 w-5" />
            New Note
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={stopCamera}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && notes.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiClipboard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a note using upload image or typing.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {notes.map((note) => (
              <li 
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{note.title || 'Untitled Note'}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {note.content?.substring(0, 100) || (note.note_type === 'handwritten' && note.image_urls?.length ? `${note.image_urls.length} image(s)` : 'No content')}
                        {note.content && note.content.length > 100 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400 capitalize">{note.note_type}</span>
                        {note.created_at && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowCreateModal(false)
                setUploadedImages([])
                reset()
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmitCreate)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create New Note</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        setUploadedImages([])
                        reset()
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Patient Selection */}
                    <div>
                      <label htmlFor="patient_id" className="block text-sm font-medium text-gray-700">
                        Patient *
                      </label>
                      <div className="mt-1">
                        <SearchablePatientSelect
                          patients={patients}
                          value={watch('patient_id')}
                          onChange={(patientId) => setValue('patient_id', patientId, { shouldValidate: true })}
                          onBlur={() => {
                            const field = register('patient_id', { required: 'Patient is required' })
                            field.onBlur()
                          }}
                          error={errors.patient_id?.message as string}
                          required
                          placeholder="Search by name or MRN..."
                        />
                      </div>
                    </div>


                    {/* Note Type */}
                    <div>
                      <label htmlFor="note_type" className="block text-sm font-medium text-gray-700">
                        Note Type *
                      </label>
                      <select
                        id="note_type"
                        {...register('note_type', { 
                          required: 'Note type is required',
                          onChange: (e) => {
                            setSelectedNoteType(e.target.value as any)
                            if (e.target.value === 'template') {
                              fetchTemplates()
                            } else {
                              setValue('template_id', undefined)
                            }
                            // Clear images if switching away from handwritten
                            if (e.target.value !== 'handwritten' && uploadedImages.length > 0) {
                              setUploadedImages([])
                              setValue('image_urls', undefined)
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                      >
                        <option value="typed">Typed</option>
                        <option value="handwritten">Handwritten</option>
                        <option value="template">Template</option>
                        <option value="voice">Voice</option>
                      </select>
                    </div>

                    {/* Image Upload Section (shown when handwritten type is selected) */}
                    {noteType === 'handwritten' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Image *
                        </label>
                        {uploadedImages.length === 0 ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={startCamera}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FiCamera className="mr-2 h-5 w-5" />
                                Open Camera
                              </button>
                              <button
                                type="button"
                                onClick={handleUploadFromFile}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FiImage className="mr-2 h-5 w-5" />
                                Upload from File
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">
                              At least one image is required for handwritten notes
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            <div className="space-y-2">
                              {uploadedImages.map((imageUrl, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={imageUrl}
                                    alt={`Uploaded ${index + 1}`}
                                    className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newImages = uploadedImages.filter((_, i) => i !== index)
                                      setUploadedImages(newImages)
                                      setValue('image_urls', newImages)
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <FiX className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={startCamera}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FiCamera className="mr-2 h-4 w-4" />
                                Add More (Camera)
                              </button>
                              <button
                                type="button"
                                onClick={handleUploadFromFile}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FiImage className="mr-2 h-4 w-4" />
                                Add More (File)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Template Selection (shown when template type is selected) */}
                    {noteType === 'template' && (
                      <div>
                        <label htmlFor="template_id" className="block text-sm font-medium text-gray-700">
                          Select Template *
                        </label>
                        {templates.length === 0 ? (
                          <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                              No templates available. Please create a template first or use a different note type.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {templates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => handleTemplateSelect(template)}
                                className="w-full text-left p-3 rounded-md border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{template.name}</p>
                                    {template.description && (
                                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                    )}
                                    {template.category && (
                                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                        {template.category}
                                      </span>
                                    )}
                                  </div>
                                  {template.is_global && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded">
                                      Global
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="hidden"
                          {...register('template_id', { 
                            required: noteType === 'template' ? 'Template selection is required' : false 
                          })}
                        />
                        {errors.template_id && (
                          <p className="mt-1 text-sm text-red-600">{errors.template_id.message}</p>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        {...register('title')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="e.g., Follow-up visit notes"
                      />
                    </div>

                    {/* Content */}
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                        Content
                      </label>
                      <textarea
                        id="content"
                        {...register('content')}
                        rows={6}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border px-3 py-2"
                        placeholder="Enter note content..."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Note'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => {
                      setShowCreateModal(false)
                      setUploadedImages([])
                      reset()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Note Detail Modal */}
      {showDetailModal && selectedNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDetailModal(false)
                setSelectedNote(null)
                setSelectedNotePatient(null)
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedNote.title || 'Untitled Note'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedNote(null)
                      setSelectedNotePatient(null)
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Note Type and Status */}
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                        {selectedNote.note_type}
                      </span>
                      {selectedNote.is_signed && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Signed
                        </span>
                      )}
                    </div>

                    {/* Patient Information */}
                    {selectedNotePatient && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <FiUser className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-700">Patient:</span>
                          <span className="text-gray-900">
                            {selectedNotePatient.first_name} {selectedNotePatient.last_name}
                            {selectedNotePatient.mrn && ` (MRN: ${selectedNotePatient.mrn})`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Images (for handwritten notes) */}
                    {selectedNote.image_urls && selectedNote.image_urls.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Images ({selectedNote.image_urls.length})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedNote.image_urls.map((imageUrl, index) => (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Note image ${index + 1}`}
                                className="w-full h-auto rounded-lg border border-gray-300 object-contain max-h-96"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    {selectedNote.content && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content
                        </label>
                        <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {selectedNote.content}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* OCR Information (if available) */}
                    {selectedNote.ocr_confidence !== null && selectedNote.ocr_confidence !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">OCR Confidence: </span>
                          <span className="text-gray-900">
                            {(selectedNote.ocr_confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {selectedNote.ocr_status && (
                          <div className="text-sm mt-1">
                            <span className="font-medium text-gray-700">OCR Status: </span>
                            <span className="text-gray-900 capitalize">{selectedNote.ocr_status}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="border-t border-gray-200 pt-4">
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selectedNote.created_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiClock className="h-4 w-4" />
                              Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.created_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                        {selectedNote.updated_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiClock className="h-4 w-4" />
                              Updated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                        {selectedNote.signed_at && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                              <FiCalendar className="h-4 w-4" />
                              Signed
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {format(new Date(selectedNote.signed_at), 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedNote(null)
                    setSelectedNotePatient(null)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

