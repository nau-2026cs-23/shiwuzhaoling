import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Users,
  AlertTriangle,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  ChevronDown,
  Search,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/constants';
import type { AdminStats, AdminPostWithUser, AdminUserEntry } from '@shared/types/api';

type AdminView = 'dashboard' | 'posts' | 'users' | 'reports';
type ReviewFilter = 'all' | 'pending' | 'approved' | 'rejected';

const LOCATION_LABELS: Record<string, string> = {
  library: '图书馆',
  dorm: '宿舍',
  canteen: '食堂',
  lab: '实验室',
  sports: '运动场',
  classroom: '教室',
};

const adminRequest = async <T = unknown>(url: string, options?: RequestInit): Promise<{ success: boolean; data: T }> => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('adminToken');
    window.location.href = '/#/admin/login';
    throw new Error('Unauthorized');
  }
  return res.json();
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [posts, setPosts] = useState<AdminPostWithUser[]>([]);
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [reportedPosts, setReportedPosts] = useState<AdminPostWithUser[]>([]);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ postId: string; title: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verify admin token on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminRequest<AdminStats>('/api/admin/stats');
      if (res.success) setStats(res.data);
    } catch { /* handled in adminRequest */ }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = reviewFilter !== 'all' ? `?reviewStatus=${reviewFilter}` : '';
      const res = await adminRequest<AdminPostWithUser[]>(`/api/admin/posts${qs}`);
      if (res.success) setPosts(res.data);
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, [reviewFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRequest<AdminUserEntry[]>('/api/admin/users');
      if (res.success) setUsers(res.data);
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRequest<AdminPostWithUser[]>('/api/admin/reports');
      if (res.success) setReportedPosts(res.data);
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => { await fetchStats(); };
    run();
  }, [fetchStats]);

  useEffect(() => {
    const run = async () => {
      if (currentView === 'posts') await fetchPosts();
      else if (currentView === 'users') await fetchUsers();
      else if (currentView === 'reports') await fetchReports();
    };
    run();
  }, [currentView, fetchPosts, fetchUsers, fetchReports]);

  const handleReview = async (postId: string, reviewStatus: 'approved' | 'rejected', adminNote?: string) => {
    try {
      const res = await adminRequest(`/api/admin/posts/${postId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ reviewStatus, adminNote }),
      });
      if ((res as { success: boolean }).success) {
        toast.success(reviewStatus === 'approved' ? '已通过审核' : '已拒绝并隐藏');
        fetchPosts();
        fetchStats();
      }
    } catch { /* handled */ }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('确定要删除这条帖子吗？此操作不可恢复。')) return;
    try {
      const res = await adminRequest(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if ((res as { success: boolean }).success) {
        toast.success('帖子已删除');
        fetchPosts();
        fetchStats();
      }
    } catch { /* handled */ }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login', { replace: true });
  };

  const filteredPosts = posts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.post.title.toLowerCase().includes(q) ||
      p.post.description.toLowerCase().includes(q) ||
      (p.user?.name || '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const navItems: { id: AdminView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: '概览', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'posts', label: '帖子审核', icon: <FileText className="w-4 h-4" />, badge: stats?.pendingPosts },
    { id: 'users', label: '用户管理', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: '举报处理', icon: <AlertTriangle className="w-4 h-4" />, badge: stats?.reportedPosts },
  ];

  const reviewStatusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-100 text-green-700 border-green-200">已通过</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border-red-200">已拒绝</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">待审核</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">管理员后台</p>
            <p className="text-slate-400 text-xs">寻回校园</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setSidebarOpen(false); setSearch(''); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
            </button>
            <h1 className="text-lg font-semibold text-slate-800">
              {navItems.find((n) => n.id === currentView)?.label}
            </h1>
          </div>
          <button
            onClick={() => {
              fetchStats();
              if (currentView === 'posts') fetchPosts();
              else if (currentView === 'users') fetchUsers();
              else if (currentView === 'reports') fetchReports();
            }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Dashboard */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: '帖子总数', value: stats?.totalPosts ?? '-', icon: <FileText className="w-5 h-5" />, color: 'blue' },
                  { label: '待审核', value: stats?.pendingPosts ?? '-', icon: <Clock className="w-5 h-5" />, color: 'yellow' },
                  { label: '已通过', value: stats?.approvedPosts ?? '-', icon: <CheckCircle className="w-5 h-5" />, color: 'green' },
                  { label: '已拒绝', value: stats?.rejectedPosts ?? '-', icon: <XCircle className="w-5 h-5" />, color: 'red' },
                  { label: '注册用户', value: stats?.totalUsers ?? '-', icon: <Users className="w-5 h-5" />, color: 'purple' },
                  { label: '被举报帖子', value: stats?.reportedPosts ?? '-', icon: <AlertTriangle className="w-5 h-5" />, color: 'orange' },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className={`inline-flex p-2 rounded-lg mb-3 ${
                      card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                      card.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' :
                      card.color === 'green' ? 'bg-green-50 text-green-600' :
                      card.color === 'red' ? 'bg-red-50 text-red-600' :
                      card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {card.icon}
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-4">快捷操作</h2>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setCurrentView('posts')} variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" />
                    审核帖子
                    {(stats?.pendingPosts ?? 0) > 0 && (
                      <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5">{stats?.pendingPosts}</span>
                    )}
                  </Button>
                  <Button onClick={() => setCurrentView('reports')} variant="outline" className="gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    处理举报
                    {(stats?.reportedPosts ?? 0) > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{stats?.reportedPosts}</span>
                    )}
                  </Button>
                  <Button onClick={() => setCurrentView('users')} variant="outline" className="gap-2">
                    <Users className="w-4 h-4" />
                    用户列表
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">管理员说明</p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>审核帖子：对帖子进行通过或拒绝操作</li>
                      <li>拒绝帖子将自动隐藏，可填写拒绝原因</li>
                      <li>举报处理：查看被举报帖子并决定是否删除</li>
                      <li>管理员操作与普通用户完全隔离</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts Review */}
          {currentView === 'posts' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索帖子标题、描述或用户名..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'pending', 'approved', 'rejected'] as ReviewFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setReviewFilter(f)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reviewFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f === 'all' ? '全部' : f === 'pending' ? '待审核' : f === 'approved' ? '已通过' : '已拒绝'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">暂无帖子</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map(({ post, user }) => (
                    <div key={post.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Image */}
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full sm:w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={post.type === 'lost' ? 'destructive' : 'default'} className="text-xs">
                              {post.type === 'lost' ? '寻物' : '招领'}
                            </Badge>
                            {reviewStatusBadge(post.reviewStatus)}
                            {post.reportCount > 0 && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                                举报 {post.reportCount} 次
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-800 truncate">{post.title}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.description}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                            <span>发布者：{user?.name || '未知'}</span>
                            <span>地点：{LOCATION_LABELS[post.location] || post.location}</span>
                            <span>时间：{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                          {post.adminNote && (
                            <p className="text-xs text-red-500 mt-1">拒绝原因：{post.adminNote}</p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 flex-shrink-0">
                          {post.reviewStatus !== 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleReview(post.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              通过
                            </Button>
                          )}
                          {post.reviewStatus !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejectModal({ postId: post.id, title: post.title }); setRejectNote(''); }}
                              className="border-red-200 text-red-600 hover:bg-red-50 gap-1 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              拒绝
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(post.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 gap-1 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {currentView === 'users' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索用户名或邮箱..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-4 py-3 font-medium text-slate-600">用户名</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">邮箱</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">学院</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">发布帖子</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">注册时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs flex-shrink-0">
                                  {u.name.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-800">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{u.email}</td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{u.college || '-'}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                {u.postCount} 条
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                              {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>暂无用户</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {currentView === 'reports' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">以下帖子已被用户举报，请审查并决定是否删除或保留</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reportedPosts.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-500">暂无被举报帖子</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportedPosts.map(({ post, user }) => (
                    <div key={post.id} className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full sm:w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={post.type === 'lost' ? 'destructive' : 'default'} className="text-xs">
                              {post.type === 'lost' ? '寻物' : '招领'}
                            </Badge>
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                              举报 {post.reportCount} 次
                            </Badge>
                            {reviewStatusBadge(post.reviewStatus)}
                          </div>
                          <h3 className="font-semibold text-slate-800 truncate">{post.title}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.description}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                            <span>发布者：{user?.name || '未知'}</span>
                            <span>地点：{LOCATION_LABELS[post.location] || post.location}</span>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs text-slate-500"
                            onClick={() => handleReview(post.id, 'approved')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            保留
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDelete(post.id)}
                            className="bg-red-600 hover:bg-red-700 text-white gap-1 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-800 mb-1">拒绝帖子</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">{rejectModal.title}</p>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">拒绝原因（可选）</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="请输入拒绝原因，将显示给发布者..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectModal(null)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  handleReview(rejectModal.postId, 'rejected', rejectNote || undefined);
                  setRejectModal(null);
                }}
              >
                确定拒绝
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
