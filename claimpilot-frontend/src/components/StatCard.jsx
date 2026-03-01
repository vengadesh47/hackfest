import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(value);
    if (start === end) return;
    const duration = 800;
    const stepTime = Math.max(Math.floor(duration / end), 20);
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ duration: 0.3 }}
      className={`bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex items-center space-x-4 border-l-4 ${color} cursor-pointer`}
    >
      <div className="p-3 rounded-xl bg-gray-50">
        <Icon className="text-[#0F3D3E]" size={28} />
      </div>
      <div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-extrabold text-gray-800">
          <AnimatedNumber value={value} />
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

export default StatCard;
