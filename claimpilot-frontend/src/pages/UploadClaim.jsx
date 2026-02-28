import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader, CloudUpload, IndianRupee } from 'lucide-react';

const UploadClaim = () => {
  const [formData, setFormData] = useState({
    patientName: '',
    hospitalName: '',
    insuranceCompany: '',
    claimType: 'preauth',
    requestedAmount: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      addToast('File size exceeds 10MB limit.', 'error');
      return false;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      addToast('Only PDF, JPEG, and PNG files are accepted.', 'error');
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      if (errors.file) setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (validateFile(droppedFile)) {
      setFile(droppedFile);
    }
  }, []);

  const removeFile = () => {
    setFile(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required.';
    if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Hospital name is required.';
    if (!formData.insuranceCompany.trim()) newErrors.insuranceCompany = 'Insurance company is required.';
    if (!formData.requestedAmount || Number(formData.requestedAmount) <= 0) {
      newErrors.requestedAmount = 'Enter a valid amount greater than 0.';
    }
    if (!file) newErrors.file = 'Please upload a claim document.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('Please fix the errors before submitting.', 'warning');
      return;
    }

    setLoading(true);
    setStatus(null);
    setUploadProgress(0);

    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (file) data.append('claimFile', file);

    try {
      const response = await api.post('/claims', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });
      setStatus({ type: 'success', message: 'Claim submitted and analyzed successfully!' });
      addToast('Claim submitted successfully! AI analysis complete.', 'success');
      setTimeout(() => navigate(`/claims/${response.data._id}`), 1500);
    } catch (error) {
      const msg = error.response?.data?.message || 'Claim submission failed. Please check the fields and try again.';
      setStatus({ type: 'error', message: msg });
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary">New Claim Submission</h1>
          <p className="text-gray-500 text-sm mt-2">
            Fill in the patient and claim details below. Our AI will analyze it instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 space-y-6">
          {/* Patient & Hospital */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Patient & Hospital Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Patient Full Name</label>
                <input
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  className={`w-full border-2 p-3 rounded-xl focus:border-primary outline-none transition text-sm font-medium ${
                    errors.patientName ? 'border-red-300 bg-red-50' : 'border-gray-100'
                  }`}
                  placeholder="e.g. Rajesh Kumar"
                />
                {errors.patientName && <p className="text-red-500 text-xs font-medium">{errors.patientName}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Hospital Name</label>
                <input
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleInputChange}
                  className={`w-full border-2 p-3 rounded-xl focus:border-primary outline-none transition text-sm font-medium ${
                    errors.hospitalName ? 'border-red-300 bg-red-50' : 'border-gray-100'
                  }`}
                  placeholder="e.g. Apollo Hospitals"
                />
                {errors.hospitalName && <p className="text-red-500 text-xs font-medium">{errors.hospitalName}</p>}
              </div>
            </div>
          </div>

          {/* Insurance & Claim Type */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Insurance & Claim Info</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Insurance Company</label>
                <input
                  name="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={handleInputChange}
                  className={`w-full border-2 p-3 rounded-xl focus:border-primary outline-none transition text-sm font-medium ${
                    errors.insuranceCompany ? 'border-red-300 bg-red-50' : 'border-gray-100'
                  }`}
                  placeholder="e.g. Star Health Insurance"
                />
                {errors.insuranceCompany && <p className="text-red-500 text-xs font-medium">{errors.insuranceCompany}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Claim Type</label>
                <select
                  name="claimType"
                  value={formData.claimType}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none transition text-sm font-medium bg-white cursor-pointer"
                >
                  <option value="preauth">Pre-Authorization</option>
                  <option value="discharge">Discharge Summary</option>
                  <option value="final">Final Billing</option>
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Requested Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  name="requestedAmount"
                  value={formData.requestedAmount}
                  onChange={handleInputChange}
                  className={`w-full border-2 pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none transition text-sm font-medium ${
                    errors.requestedAmount ? 'border-red-300 bg-red-50' : 'border-gray-100'
                  }`}
                  placeholder="0.00"
                  min="1"
                />
              </div>
              {errors.requestedAmount && <p className="text-red-500 text-xs font-medium">{errors.requestedAmount}</p>}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Upload Claim Document</span>
            </h3>

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border-2 border-primary/20 bg-primary/5 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="drop-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center space-y-3 transition-all duration-200 cursor-pointer relative ${
                    isDragOver
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : errors.file
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <CloudUpload
                    size={36}
                    className={isDragOver ? 'text-primary' : 'text-gray-400'}
                  />
                  <div className="text-center">
                    <p className="text-gray-800 font-semibold text-sm">
                      {isDragOver ? 'Drop your file here' : 'Drag & drop your claim document'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPEG, or PNG up to 10MB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {errors.file && !file && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.file}</p>}
          </div>

          {/* Progress Bar */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">
                  {uploadProgress < 100 ? 'Uploading...' : 'Analyzing with AI...'}
                </span>
                <span className="text-primary font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {uploadProgress >= 100 && (
                <div className="flex items-center space-x-2 text-primary text-sm font-medium">
                  <Loader className="animate-spin" size={16} />
                  <span>Running AI analysis on your claim...</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-base text-white transition-all shadow-md flex items-center justify-center space-x-2 ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-opacity-90 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Processing Claim...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Submit Claim for AI Analysis</span>
              </>
            )}
          </button>

          {/* Status Message */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-center space-x-3 ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p className="font-medium text-sm">{status.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
};

export default UploadClaim;
