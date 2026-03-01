const Footer = () => {
  return (
    <footer className="bg-[#0F3D3E] text-gray-300 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-[#D9C27A] rounded-lg flex items-center justify-center text-[#0F3D3E] font-extrabold text-sm">CP</div>
              <span className="text-lg font-bold text-[#D9C27A]">ClaimPilot India</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              AI-powered Third Party Administrator platform for Indian healthcare claim processing.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[#D9C27A] transition">Features</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Pricing</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">API Docs</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[#D9C27A] transition">About Us</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Careers</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Blog</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[#D9C27A] transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">IRDAI Compliance</a></li>
              <li><a href="#" className="hover:text-[#D9C27A] transition">Data Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>2026 ClaimPilot India Pvt. Ltd. All rights reserved.</p>
          <p>Built with care for Indian healthcare.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
