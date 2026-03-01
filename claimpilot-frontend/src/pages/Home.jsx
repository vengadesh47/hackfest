import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, ShieldCheck, FileText, Cpu, Upload, BarChart3, CheckCircle, Star, Users, Zap, Clock, TrendingUp } from 'lucide-react';
import Footer from '../components/Footer';

const AnimatedCounter = ({ target, suffix = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
    >
      {isInView && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {target}{suffix}
        </motion.span>
      )}
    </motion.span>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
};

const Home = () => {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security ensuring all patient data is protected and compliant with IRDAI and local regulations.',
    },
    {
      icon: FileText,
      title: 'Fast Submissions',
      description: 'Upload medical documents and pre-auth forms in seconds with our intuitive drag-and-drop interface.',
    },
    {
      icon: Cpu,
      title: 'AI-Driven Insights',
      description: 'Instant validation against policy terms using advanced AI models to reduce rejection rates by up to 40%.',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      icon: Upload,
      title: 'Upload Claim',
      description: 'Submit patient details and upload claim documents through our secure portal.',
    },
    {
      step: '02',
      icon: Cpu,
      title: 'AI Analysis',
      description: 'Our AI engine analyzes the claim against policy terms, medical codes, and historical patterns.',
    },
    {
      step: '03',
      icon: BarChart3,
      title: 'Get Results',
      description: 'Receive instant approval status with detailed insights and recommended actions.',
    },
    {
      step: '04',
      icon: CheckCircle,
      title: 'Track & Manage',
      description: 'Monitor all claims in real-time from your dashboard with full audit trail.',
    },
  ];

  const stats = [
    { value: '98%', label: 'Accuracy Rate', icon: TrendingUp },
    { value: '< 30s', label: 'Processing Time', icon: Clock },
    { value: '500+', label: 'Hospitals Onboarded', icon: Users },
    { value: '2M+', label: 'Claims Processed', icon: Zap },
  ];

  const testimonials = [
    {
      name: 'Dr. Priya Sharma',
      role: 'Medical Director, Apollo Hospitals',
      quote: 'ClaimPilot reduced our claim rejection rate by 35% in the first quarter. The AI analysis catches discrepancies we used to miss.',
      rating: 5,
    },
    {
      name: 'Rajesh Menon',
      role: 'TPA Manager, Star Health Insurance',
      quote: 'Processing time dropped from 48 hours to under a minute. Our team can now focus on complex cases instead of routine paperwork.',
      rating: 5,
    },
    {
      name: 'Dr. Anitha Krishnan',
      role: 'CFO, Fortis Healthcare',
      quote: 'The dashboard gives us complete visibility into our claims pipeline. Revenue cycle management has never been this efficient.',
      rating: 5,
    },
  ];

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8"
          >
            <Zap size={16} className="text-accent mr-2" />
            <span className="text-sm font-semibold text-accent">Trusted by 500+ hospitals across India</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight"
          >
            AI-Powered TPA
            <span className="block text-accent">Claim Processing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg md:text-xl max-w-3xl mx-auto mb-10 text-gray-200 leading-relaxed"
          >
            Empowering hospitals and insurance providers with ClaimPilot India.
            Streamline your medical claims with instant AI analysis, automated workflows,
            and real-time tracking.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="bg-accent text-primary px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform inline-flex items-center space-x-2 shadow-lg shadow-accent/20"
            >
              <span>Get Started Free</span>
              <ArrowRight size={20} />
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition inline-flex items-center space-x-2"
            >
              <span>See How It Works</span>
            </a>
          </motion.div>
        </div>
      </header>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx}
                className="text-center"
              >
                <stat.icon className="mx-auto text-primary mb-3" size={28} />
                <p className="text-3xl md:text-4xl font-extrabold text-primary">
                  <AnimatedCounter target={stat.value} />
                </p>
                <p className="text-gray-500 font-medium mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-4">
              Why Choose ClaimPilot?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Built specifically for the Indian healthcare ecosystem with deep understanding of TPA workflows.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx}
                className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-accent/30 transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-primary/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition">
                  <feature.icon className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-primary py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg">
              Four simple steps to process your medical claims with AI-powered precision.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx}
                className="relative text-center"
              >
                <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <item.icon className="text-accent" size={28} />
                </div>
                <span className="text-accent font-extrabold text-sm tracking-widest">{item.step}</span>
                <h3 className="text-xl font-bold text-white mt-2 mb-3">{item.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{item.description}</p>
                {idx < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t-2 border-dashed border-accent/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-4">
              Trusted by Healthcare Leaders
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              See what industry professionals say about ClaimPilot.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx}
                className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center space-x-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={18} className="text-accent fill-accent" />
                  ))}
                </div>
                <p className="text-gray-600 italic leading-relaxed mb-6">"{t.quote}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-bold text-gray-800">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 px-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            Ready to Transform Your Claims Process?
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
            Join 500+ hospitals already using ClaimPilot to process claims faster, reduce rejections, and improve revenue cycles.
          </p>
          <Link
            to="/login"
            className="bg-accent text-primary px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform inline-flex items-center space-x-2 shadow-lg shadow-accent/20"
          >
            <span>Start Processing Claims</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
