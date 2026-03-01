import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Mail, ArrowRight, Loader, Building2, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      addToast('Welcome back! Login successful.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await register(formData.name, formData.email, formData.password, 'billing_staff');
      addToast('Account created successfully! Welcome to ClaimPilot.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex bg-bg">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-extrabold text-white mb-4">
              ClaimPilot <span className="text-accent">India</span>
            </h2>
            <p className="text-gray-300 text-lg mb-12 leading-relaxed">
              The most trusted TPA platform for hospitals and insurance providers across India.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-white font-bold">IRDAI Compliant</h4>
                  <p className="text-gray-400 text-sm">Full compliance with Indian insurance regulations.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-white font-bold">500+ Hospitals</h4>
                  <p className="text-gray-400 text-sm">Trusted network of healthcare providers nationwide.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          {/* Logo for mobile */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-2xl font-extrabold text-primary">
              ClaimPilot <span className="text-accent">India</span>
            </h2>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { if (!loading && isRegister) switchMode(); }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                !isRegister
                  ? 'bg-white text-primary shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { if (!loading && !isRegister) switchMode(); }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                isRegister
                  ? 'bg-white text-primary shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isRegister ? 'register' : 'login'}
              initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-100">
                <h1 className="text-2xl font-extrabold text-primary mb-1">
                  {isRegister ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="text-gray-500 mb-8 text-sm">
                  {isRegister
                    ? 'Get started with ClaimPilot in seconds.'
                    : 'Sign in to access your TPA dashboard.'}
                </p>

                <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5">
                  {isRegister && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={18} />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium text-sm"
                          placeholder="Dr. Priya Sharma"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={18} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium text-sm"
                        placeholder="admin@claimpilot.in"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={18} />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium text-sm"
                        placeholder="Min. 6 characters"
                      />
                    </div>
                  </div>

                  {isRegister && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition" size={18} />
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary outline-none transition font-medium text-sm"
                          placeholder="Re-enter password"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm font-bold text-center bg-red-50 p-3 rounded-lg border border-red-100"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-opacity-90 transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader className="animate-spin" size={22} />
                    ) : (
                      <>
                        <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => !loading && switchMode()}
                    className="text-sm text-gray-500 hover:text-primary font-medium transition"
                  >
                    {isRegister
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Create one"}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
