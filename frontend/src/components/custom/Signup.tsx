import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/constants';
import { Eye, EyeOff, Search } from 'lucide-react';

const COLLEGES = ['计算机学院', '理学院', '工学院', '文学院', '经济管理学院', '医学院', '法学院', '艺术学院'];

const Signup = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    phone: '',
    college: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated === true) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('请填写所有必填项');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码至少需要6位字符');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          studentId: form.studentId || undefined,
          phone: form.phone || undefined,
          college: form.college || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.data?.token) {
        login(data.data.token);
        toast.success('注册成功', { description: `欢迎加入寻回校园，${form.name}！` });
        navigate('/', { replace: true });
      } else {
        // Handle both error formats: { message } and { error: { message } }
        const errMsg = data.message || data.error?.message || data.error?.details?.[0]?.message || '注册失败，请稍后重试';
        setError(errMsg);
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center shadow-md">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">寻回校园</h1>
            <p className="text-xs text-[#64748B]">校园失物招领平台</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#1D4ED8] to-[#0EA5E9] p-6 text-white">
            <h2 className="text-2xl font-bold">注册账号</h2>
            <p className="text-blue-100 text-sm mt-1">注册即用，无需审核，立刻开始使用</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="真实姓名"
                  autoComplete="name"
                  className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                  学号
                </label>
                <input
                  name="studentId"
                  type="text"
                  value={form.studentId}
                  onChange={handleChange}
                  placeholder="如：2023010001"
                  className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="请输入邮箱"
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                学院
              </label>
              <select
                name="college"
                value={form.college}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              >
                <option value="">选择学院（可选）</option>
                {COLLEGES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="至少6位字符"
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                手机号 <span className="text-[#64748B] font-normal normal-case">（可选，用于找回密码）</span>
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="选填"
                autoComplete="tel"
                className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <svg className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-[#1D4ED8]">学号仅作为身份标识，平台不验证真伪。手机号和邮箱为选填项，不会公开显示。</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '立即注册，马上使用'}
            </button>

            <p className="text-center text-xs text-[#64748B]">
              已有账号？{' '}
              <Link to="/login" className="text-[#1D4ED8] font-medium hover:underline">
                立即登录
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
