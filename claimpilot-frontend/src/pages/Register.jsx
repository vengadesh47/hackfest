import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Lock, Mail, ArrowRight, Loader, UserPlus } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('billing_staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-gray-100"
      >
        <h1 className="text-3xl font-extrabold text-primary mb-2 text-center">ClaimPilot India</h1>
        <p className="text-gray-500 mb-8 text-center font-medium uppercase tracking-widest text-xs">Create Your Account</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Full Name</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={20} />
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium" 
                placeholder="John Doe" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={20} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium" 
                placeholder="admin@claimpilot.in" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium"
            >
              <option value="billing_staff">Billing Staff</option>
              <option value="tpa_staff">TPA Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={20} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={20} />
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm font-bold text-center bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-opacity-90 transition shadow-lg flex items-center justify-center space-x-2"
          >
            {loading ? <Loader className="animate-spin" size={24} /> : (
              <>
                <UserPlus size={20} />
                <span>Create Account</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
