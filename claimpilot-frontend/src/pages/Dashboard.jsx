import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import { FileText, CheckCircle, XCircle, Clock, Plus, ArrowRight, Search, Trash2, Filter, RefreshCw, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchClaims = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/claims');
      setClaims(data);
    } catch (error) {
      addToast('Failed to fetch claims. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleDelete = async (id, patientName) => {
    if (!window.confirm(`Are you sure you want to delete the claim for "${patientName}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/claims/${id}`);
      setClaims(prev => prev.filter(c => c._id !== id));
      addToast(`Claim for "${patientName}" deleted successfully.`, 'success');
    } catch (error) {
      addToast('Failed to delete claim. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (id, patientName) => {
    setDownloadingId(id);
    try {
      const response = await api.get(`/claims/${id}/report`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ClaimReport_${patientName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(`Report for "${patientName}" downloaded.`, 'success');
    } catch (error) {
      addToast('Failed to download report.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      const matchesSearch =
        claim.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.hospitalName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        claim.status === statusFilter ||
        (statusFilter === 'pending' && (claim.status === 'pending' || claim.status === 'partial'));
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, statusFilter]);

  const stats = [
    { title: 'Total Claims', value: claims.length, icon: FileText, color: 'border-primary' },
    { title: 'Approved', value: claims.filter(c => c.status === 'approved').length, icon: CheckCircle, color: 'border-green-500' },
    { title: 'Rejected', value: claims.filter(c => c.status === 'rejected').length, icon: XCircle, color: 'border-red-500' },
    { title: 'Pending', value: claims.filter(c => c.status === 'pending' || c.status === 'partial').length, icon: Clock, color: 'border-yellow-500' },
  ];

  if (loading) {
    return (
      <div className="p-8 bg-bg min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-bg min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary">Claims Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track all your TPA claims</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchClaims(true)}
            disabled={refreshing}
            className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            title="Refresh claims"
          >
            <RefreshCw size={18} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/upload"
            className="bg-primary text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 hover:bg-opacity-90 transition shadow-md text-sm font-bold"
          >
            <Plus size={18} />
            <span>New Claim</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        {/* Table Header with Search & Filter */}
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Recent Claims</h2>
              <p className="text-sm text-gray-500">
                Showing {filteredClaims.length} of {claims.length} claims
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search patient, hospital, insurer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
              </div>
              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:border-primary outline-none transition appearance-none bg-white cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending / Partial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Patient Name</th>
                <th className="px-6 py-3.5 font-semibold hidden md:table-cell">Hospital</th>
                <th className="px-6 py-3.5 font-semibold">Insurance</th>
                <th className="px-6 py-3.5 font-semibold">Amount</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredClaims.map((claim) => (
                  <motion.tr
                    key={claim._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50/50 transition group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800 text-sm">{claim.patientName}</p>
                      <p className="text-xs text-gray-400 mt-0.5 uppercase">{claim.claimType}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm hidden md:table-cell">{claim.hospitalName}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{claim.insuranceCompany}</td>
                    <td className="px-6 py-4 text-gray-800 font-bold text-sm">
                      ₹{claim.requestedAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          claim.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : claim.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : claim.status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/claims/${claim._id}`)}
                          className="text-primary hover:text-accent flex items-center space-x-1 font-semibold text-sm transition"
                        >
                          <span>View</span>
                          <ArrowRight size={14} />
                        </button>
                        <button
                          onClick={() => handleDownload(claim._id, claim.patientName)}
                          disabled={downloadingId === claim._id}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Download report"
                        >
                          {downloadingId === claim._id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(claim._id, claim.patientName)}
                          disabled={deletingId === claim._id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Delete claim"
                        >
                          {deletingId === claim._id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FileText size={40} className="text-gray-300" />
                      <p className="text-gray-500 font-medium">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No claims match your search criteria.'
                          : 'No claims submitted yet.'}
                      </p>
                      {!searchQuery && statusFilter === 'all' && (
                        <Link
                          to="/upload"
                          className="text-primary font-bold text-sm hover:underline flex items-center space-x-1"
                        >
                          <Plus size={16} />
                          <span>Submit your first claim</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
