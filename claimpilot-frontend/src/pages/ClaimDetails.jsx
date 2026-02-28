import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Building2, ShieldCheck, Cpu, CheckCircle, XCircle,
  AlertTriangle, FileText, Clock, TrendingUp, Download, RefreshCw, Calendar
} from 'lucide-react';

const TimelineStep = ({ icon: Icon, title, description, isActive, isComplete, isLast }) => (
  <div className="flex items-start space-x-3">
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isComplete
            ? 'bg-green-100 text-green-600'
            : isActive
            ? 'bg-primary text-white ring-4 ring-primary/20'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {isComplete ? <CheckCircle size={16} /> : <Icon size={16} />}
      </div>
      {!isLast && (
        <div className={`w-0.5 h-8 mt-1 ${isComplete ? 'bg-green-200' : 'bg-gray-200'}`} />
      )}
    </div>
    <div className="pb-6">
      <p className={`text-sm font-bold ${isComplete || isActive ? 'text-gray-800' : 'text-gray-400'}`}>
        {title}
      </p>
      <p className={`text-xs mt-0.5 ${isComplete || isActive ? 'text-gray-500' : 'text-gray-300'}`}>
        {description}
      </p>
    </div>
  </div>
);

const ClaimDetails = () => {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiTyping, setAiTyping] = useState(true);
  const [displayedAnalysis, setDisplayedAnalysis] = useState('');
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const { data } = await api.get(`/claims/${id}`);
        setClaim(data);
      } catch (error) {
        addToast('Failed to load claim details.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchClaim();
  }, [id]);

  useEffect(() => {
    if (!claim?.aiAnalysis) return;
    const text = claim.aiAnalysis;
    let index = 0;
    setDisplayedAnalysis('');
    setAiTyping(true);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedAnalysis(text.slice(0, index + 1));
        index++;
      } else {
        setAiTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [claim?.aiAnalysis]);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/claims/${id}/report`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ClaimReport_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Report downloaded successfully!', 'success');
    } catch (error) {
      addToast('Failed to download report. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center">
        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Claim Not Found</h2>
        <p className="text-gray-500 mt-2 mb-6">The claim you are looking for does not exist or has been deleted.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary font-bold hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-500',
          label: 'Approved',
          bgGradient: 'from-green-500 to-emerald-600',
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-500',
          label: 'Rejected',
          bgGradient: 'from-red-500 to-rose-600',
        };
      case 'partial':
        return {
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          label: 'Partial Approval',
          bgGradient: 'from-yellow-500 to-amber-600',
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: Clock,
          iconColor: 'text-blue-500',
          label: 'Pending',
          bgGradient: 'from-blue-500 to-indigo-600',
        };
    }
  };

  const statusConfig = getStatusConfig(claim.status);
  const StatusIcon = statusConfig.icon;

  const approvalPercentage = claim.requestedAmount > 0
    ? Math.round((claim.approvalAmount / claim.requestedAmount) * 100)
    : 0;

  const timelineSteps = [
    { icon: FileText, title: 'Claim Submitted', description: 'Documents uploaded and received', isComplete: true, isActive: false },
    { icon: Cpu, title: 'AI Analysis', description: 'Automated policy validation complete', isComplete: true, isActive: false },
    {
      icon: statusConfig.icon,
      title: `Decision: ${statusConfig.label}`,
      description: claim.status === 'approved' ? 'Full amount approved' :
                   claim.status === 'partial' ? 'Partial amount approved' :
                   claim.status === 'rejected' ? 'Claim was rejected' : 'Awaiting review',
      isComplete: claim.status !== 'pending',
      isActive: claim.status === 'pending',
    },
    {
      icon: TrendingUp,
      title: 'Settlement',
      description: claim.status === 'approved' || claim.status === 'partial' ? 'Ready for processing' : 'Pending decision',
      isComplete: claim.status === 'approved',
      isActive: claim.status === 'partial',
    },
  ];

  const formattedDate = claim.createdAt
    ? new Date(claim.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-gray-500 hover:text-primary font-semibold mb-6 text-sm transition"
      >
        <ArrowLeft size={18} />
        <span>Back to Dashboard</span>
      </button>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${statusConfig.bgGradient} p-6 md:p-8 rounded-2xl shadow-lg mb-8 text-white`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <StatusIcon size={20} />
              <span className="text-sm font-bold uppercase tracking-wider opacity-90">
                Claim Status: {statusConfig.label}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{claim.patientName}</h1>
            <div className="flex items-center space-x-2 mt-2 opacity-80 text-sm">
              <Calendar size={14} />
              <span>Submitted {formattedDate}</span>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-medium opacity-80">Approved Amount</p>
            <p className="text-3xl md:text-4xl font-extrabold">
              ₹{claim.approvalAmount?.toLocaleString() || '0'}
            </p>
            <p className="text-sm opacity-70 mt-1">
              of ₹{claim.requestedAmount?.toLocaleString()} requested ({approvalPercentage}%)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${approvalPercentage}%` }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient & Claim Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100"
          >
            <h2 className="text-lg font-extrabold text-primary mb-6">Claim Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-primary/5 rounded-lg text-primary"><User size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Patient</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{claim.patientName}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-primary/5 rounded-lg text-primary"><Building2 size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Hospital</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{claim.hospitalName}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-primary/5 rounded-lg text-primary"><ShieldCheck size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Insurance</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{claim.insuranceCompany}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-primary/5 rounded-lg text-primary"><FileText size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Claim Type</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 uppercase">{claim.claimType}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-accent/30"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Cpu className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-primary">AI Analysis</h3>
                <p className="text-xs text-gray-500">Powered by ClaimPilot AI Engine</p>
              </div>
              {aiTyping && (
                <div className="ml-auto flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <p className="text-gray-700 leading-relaxed text-sm font-medium">
                "{displayedAnalysis}"
                {aiTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
              </p>
            </div>
          </motion.div>

          {/* Rejection Reason */}
          {claim.rejectionReason && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 border border-red-200 p-6 rounded-2xl"
            >
              <h4 className="text-red-700 font-bold mb-2 flex items-center space-x-2 text-sm">
                <XCircle size={16} />
                <span>Rejection Reason</span>
              </h4>
              <p className="text-red-600 font-medium text-sm">{claim.rejectionReason}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-100"
          >
            <h3 className="text-lg font-extrabold text-primary mb-5">Claim Timeline</h3>
            <div>
              {timelineSteps.map((step, idx) => (
                <TimelineStep
                  key={idx}
                  {...step}
                  isLast={idx === timelineSteps.length - 1}
                />
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-100"
          >
            <h3 className="text-lg font-extrabold text-primary mb-4">Quick Actions</h3>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="bg-primary text-white w-full py-3 rounded-xl font-bold text-sm hover:bg-opacity-90 transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download Report</span>
                  </>
                )}
              </button>
              {(claim.status === 'rejected' || claim.status === 'partial') && (
                <button
                  onClick={() => navigate('/upload')}
                  className="bg-accent text-primary w-full py-3 rounded-xl font-bold text-sm hover:opacity-90 transition shadow-md flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={16} />
                  <span>Resubmit Claim</span>
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="border-2 border-gray-200 text-gray-600 w-full py-3 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition flex items-center justify-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetails;
