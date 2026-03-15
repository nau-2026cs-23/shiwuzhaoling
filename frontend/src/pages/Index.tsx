import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { postsApi, messagesApi, profileApi, authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import type {
  PostWithUser,
  TabFilter,
  TimeFilter,
  AppView,
  CommentWithUser,
  MessageItem,
  ConversationItem,
  PostItem,
  FavoriteItem,
  BlockItem,
  CurrentUser,
} from '@/types';
import {
  Search,
  Bell,
  Menu,
  X,
  Plus,
  MessageCircle,
  User,
  Home,
  ChevronRight,
  MapPin,
  Clock,
  Bookmark,
  LogOut,
} from 'lucide-react';

// ============================================
// Utility helpers
// ============================================
const LOCATIONS = ['全部地点', '图书馆', '宿舍楼', '食堂', '实验室', '操场/体育馆', '教学楼'];

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const getAvatarUrl = (name: string, avatarUrl?: string) => {
  if (avatarUrl) return avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1D4ED8&color=fff&size=40`;
};

const POST_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  lost: { label: '寻物', color: 'bg-red-500' },
  found: { label: '招领', color: 'bg-emerald-500' },
  completed: { label: '已完成', color: 'bg-slate-400' },
};

// ============================================
// Post Card Component
// ============================================
const PostCard = ({
  item,
  onClick,
  onMessage,
}: {
  item: PostWithUser;
  onClick: () => void;
  onMessage: (e: React.MouseEvent) => void;
}) => {
  const { post, user } = item;
  const isCompleted = post.status === 'completed';
  const typeInfo = isCompleted
    ? POST_TYPE_LABELS.completed
    : POST_TYPE_LABELS[post.type] || POST_TYPE_LABELS.lost;

  const defaultImages: Record<string, string> = {
    lost: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop',
    found: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=200&fit=crop',
  };
  const imgSrc = post.imageUrl || defaultImages[post.type] || defaultImages.lost;

  return (
    <article
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer ${
        isCompleted ? 'opacity-70' : ''
      }`}
    >
      <div className="relative">
        <img
          src={imgSrc}
          alt={post.title}
          className={`w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-300 ${
            isCompleted ? 'grayscale' : ''
          }`}
        />
        <div className="absolute top-3 left-3">
          <span className={`${typeInfo.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
            {typeInfo.label}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {post.location}
          </span>
        </div>
        {isCompleted && (
          <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
            <div className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              已成功归还
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#0F172A] text-base mb-1 group-hover:text-[#1D4ED8] transition-colors leading-tight line-clamp-1">
          {post.title}
        </h3>
        <p className="text-sm text-[#64748B] line-clamp-2 mb-3 leading-relaxed">{post.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={getAvatarUrl(user?.name || '用户', user?.avatarUrl)}
              alt={user?.name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-xs text-[#64748B]">
              {user?.name || '匿名'} · {formatTime(post.createdAt)}
            </span>
          </div>
          {!isCompleted ? (
            <button
              onClick={onMessage}
              className="text-xs font-semibold text-[#1D4ED8] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              私信TA
            </button>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">✓ 已归还</span>
          )}
        </div>
      </div>
    </article>
  );
};

// ============================================
// Main Index Component
// ============================================
const Index = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Navigation state
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagePartnerId, setMessagePartnerId] = useState<string | null>(null);
  const [createPostType, setCreatePostType] = useState<'lost' | 'found'>('lost');

  // Home page state
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPosts = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const currentPage = reset ? 1 : page;
        const res = await postsApi.getAll({
          type: tabFilter === 'all' ? undefined : tabFilter,
          location: locationFilter === 'all' ? undefined : locationFilter,
          timeFilter: timeFilter === 'all' ? undefined : timeFilter,
          search: searchQuery || undefined,
          page: currentPage,
          limit: 12,
        });
        if (res.success) {
          const newPosts = res.data || [];
          if (reset) {
            setPosts(newPosts);
            setPage(2);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
            setPage((p) => p + 1);
          }
          setHasMore(newPosts.length === 12);
        }
      } catch (_err) {
        toast.error('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [tabFilter, locationFilter, timeFilter, searchQuery, page]
  );

  useEffect(() => {
    fetchPosts(true);
  }, [tabFilter, locationFilter, timeFilter, searchQuery]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await messagesApi.getUnreadCount();
        if (res.success) setUnreadCount(res.data.count);
      } catch (_err) {
        /* ignore */
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleMessageClick = (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    setMessagePartnerId(partnerId);
    setCurrentView('messages');
  };

  const handleCreatePost = (type: 'lost' | 'found') => {
    setCreatePostType(type);
    setCurrentView('create-post');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { id: 'home' as AppView, label: '首页', icon: Home },
    { id: 'messages' as AppView, label: '消息中心', icon: MessageCircle, badge: unreadCount },
    { id: 'profile' as AppView, label: '个人中心', icon: User },
  ];

  // ============================================
  // Render sub-views
  // ============================================
  const renderContent = () => {
    if (currentView === 'post-detail' && selectedPostId) {
      return (
        <PostDetailView
          postId={selectedPostId}
          onBack={() => setCurrentView('home')}
          onMessage={(partnerId) => {
            setMessagePartnerId(partnerId);
            setCurrentView('messages');
          }}
        />
      );
    }
    if (currentView === 'create-post') {
      return (
        <CreatePostView
          initialType={createPostType}
          onBack={() => setCurrentView('home')}
          onSuccess={() => {
            setCurrentView('home');
            fetchPosts(true);
          }}
        />
      );
    }
    if (currentView === 'messages') {
      return (
        <MessagesView
          initialPartnerId={messagePartnerId}
          onBack={() => {
            setMessagePartnerId(null);
            setCurrentView('home');
          }}
        />
      );
    }
    if (currentView === 'profile') {
      return (
        <ProfileView
          onBack={() => setCurrentView('home')}
          onViewPost={(id) => {
            setSelectedPostId(id);
            setCurrentView('post-detail');
          }}
          onMessage={(partnerId) => {
            setMessagePartnerId(partnerId);
            setCurrentView('messages');
          }}
          onCreatePost={() => setCurrentView('create-post')}
        />
      );
    }

    // Home view
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 shadow-sm">
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-2">
              搜索物品
            </label>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="关键词，如：钥匙、水杯..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            </form>
          </div>

          {/* Location Filter */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 shadow-sm">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-3">按地点筛选</p>
            <div className="space-y-1">
              {LOCATIONS.map((loc) => {
                const val = loc === '全部地点' ? 'all' : loc;
                return (
                  <label key={loc} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="location"
                      checked={locationFilter === val}
                      onChange={() => setLocationFilter(val)}
                      className="accent-[#1D4ED8]"
                    />
                    <span className="text-sm text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors">
                      {loc}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Time Filter */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 shadow-sm">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-3">按时间筛选</p>
            <div className="space-y-1">
              {[{ val: 'all', label: '全部时间' }, { val: 'today', label: '今天' }, { val: 'week', label: '近7天' }, { val: 'month', label: '近30天' }].map(
                ({ val, label }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="time"
                      checked={timeFilter === val}
                      onChange={() => setTimeFilter(val as TimeFilter)}
                      className="accent-[#1D4ED8]"
                    />
                    <span className="text-sm text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors">
                      {label}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Quick Post CTA */}
          <div className="bg-gradient-to-br from-[#F59E0B] to-orange-400 rounded-2xl p-4 text-white">
            <p className="font-bold text-sm mb-1">丢失了东西？</p>
            <p className="text-xs text-orange-100 mb-3">立即发布寻物启事，让更多同学帮你找回。</p>
            <button
              onClick={() => handleCreatePost('lost')}
              className="w-full bg-white text-orange-500 font-semibold text-sm py-2 rounded-xl hover:bg-orange-50 transition-all duration-200"
            >
              立即发布
            </button>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="flex-1 min-w-0">
          {/* Tab Bar */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-1.5 flex gap-1 mb-5 shadow-sm">
            {[{ val: 'all', label: '全部' }, { val: 'lost', label: '🔍 寻物' }, { val: 'found', label: '📦 招领' }].map(
              ({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setTabFilter(val as TabFilter)}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tabFilter === val
                      ? 'bg-[#1D4ED8] text-white font-semibold'
                      : 'text-[#64748B] hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* Posts Grid */}
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-sm animate-pulse">
                  <div className="w-full h-40 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-[#64748B] font-medium">暂无相关帖子</p>
              <p className="text-sm text-[#64748B] mt-1">试试调整筛选条件，或发布一条新帖子</p>
              <button
                onClick={() => handleCreatePost('lost')}
                className="mt-4 bg-[#1D4ED8] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                发布帖子
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((item) => (
                  <PostCard
                    key={item.post.id}
                    item={item}
                    onClick={() => {
                      setSelectedPostId(item.post.id);
                      setCurrentView('post-detail');
                    }}
                    onMessage={(e) => handleMessageClick(e, item.post.userId)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchPosts(false)}
                    disabled={loading}
                    className="bg-white border border-[#CBD5E1] text-[#64748B] font-medium px-8 py-3 rounded-xl text-sm hover:bg-gray-50 hover:text-[#0F172A] transition-all duration-200 shadow-sm disabled:opacity-60"
                  >
                    {loading ? '加载中...' : '加载更多帖子'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#CBD5E1] sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0F172A]">寻回校园</span>
              <span className="hidden sm:inline text-xs text-[#64748B] border border-[#CBD5E1] rounded-full px-2 py-0.5">
                失物招领平台
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id)}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === id
                      ? 'text-[#1D4ED8] bg-blue-50'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <button
                onClick={() => setCurrentView('messages')}
                className="relative p-2 rounded-lg text-[#64748B] hover:bg-gray-100 transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Create Post Button */}
              <button
                onClick={() => handleCreatePost('lost')}
                className="hidden sm:flex items-center gap-1.5 bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                发布信息
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 rounded-lg text-[#64748B] hover:bg-gray-100 hover:text-red-500 transition-all duration-200"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[#64748B] hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#CBD5E1] bg-white px-4 py-3 space-y-1">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentView(id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentView === id
                    ? 'text-[#1D4ED8] bg-blue-50'
                    : 'text-[#64748B] hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge && badge > 0 ? (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
            <button
              onClick={() => {
                handleCreatePost('lost');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1D4ED8]"
            >
              <Plus className="w-4 h-4" />
              发布信息
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        )}
      </nav>

      {/* Hero Banner (home only) */}
      {currentView === 'home' && (
        <div className="bg-gradient-to-br from-[#1D4ED8] to-[#0EA5E9] text-white">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">
                  校园失物招领平台
                </p>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                  丢失了东西？<br />在这里找回它。
                </h1>
                <p className="text-blue-100 text-base max-w-md">
                  注册即用，无需审核。发布寻物或招领信息，通过站内私信安全沟通，保护你的隐私。
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleCreatePost('lost')}
                    className="bg-white text-[#1D4ED8] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-all duration-200 shadow-md"
                  >
                    发布寻物启事
                  </button>
                  <button
                    onClick={() => handleCreatePost('found')}
                    className="bg-white/20 backdrop-blur-sm text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/30 transition-all duration-200 border border-white/30"
                  >
                    我捡到东西了
                  </button>
                </div>
              </div>
              <div className="hidden md:grid grid-cols-3 gap-3 text-center">
                {[{ num: '1,240', label: '注册用户' }, { num: '386', label: '成功归还' }, { num: '32%', label: '周归还率' }].map(
                  ({ num, label }) => (
                    <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-3xl font-bold">{num}</div>
                      <div className="text-blue-200 text-xs mt-1">{label}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      <OmniflowBadge />
      <Toaster />
    </div>
  );
};

// ============================================
// Post Detail View
// ============================================
const PostDetailView = ({
  postId,
  onBack,
  onMessage,
}: {
  postId: string;
  onBack: () => void;
  onMessage: (partnerId: string) => void;
}) => {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [similar, setSimilar] = useState<PostWithUser[]>([]);

  const [commentText, setCommentText] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [postRes, commentsRes, similarRes] = await Promise.all([
          postsApi.getById(postId),
          postsApi.getComments(postId),
          postsApi.getSimilar(postId),
        ]);
        if (postRes.success) setData(postRes.data);
        if (commentsRes.success) setComments(commentsRes.data || []);
        if (similarRes.success) setSimilar(similarRes.data || []);

        if (isAuthenticated) {
          const favRes = await postsApi.checkFavorite(postId);
          if (favRes.success) setIsFavorited(favRes.data.favorited);
        }
      } catch (_err) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId, isAuthenticated]);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await postsApi.addComment(postId, commentText);
      if (res.success) {
        setCommentText('');
        const commentsRes = await postsApi.getComments(postId);
        if (commentsRes.success) setComments(commentsRes.data || []);
        toast.success('评论发表成功');
      }
    } catch (_err) {
      toast.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFavorite = async () => {
    try {
      const res = await postsApi.toggleFavorite(postId);
      if (res.success) {
        setIsFavorited(res.data.favorited);
        toast.success(res.data.favorited ? '已收藏' : '已取消收藏');
      }
    } catch (_err) {
      toast.error('操作失败');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      const res = await postsApi.report(postId, reportReason);
      if (res.success) {
        toast.success('举报已提交');
        setShowReportModal(false);
        setReportReason('');
      } else {
        toast.info('你已经举报过该帖子');
      }
    } catch (_err) {
      toast.error('举报失败');
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const res = await postsApi.markCompleted(postId);
      if (res.success) {
        toast.success('帖子已标记为已完成');
        const postRes = await postsApi.getById(postId);
        if (postRes.success) setData(postRes.data);
      }
    } catch (_err) {
      toast.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-[#64748B]">帖子不存在或已被删除</p>
        <button onClick={onBack} className="mt-4 text-[#1D4ED8] hover:underline text-sm">返回首页</button>
      </div>
    );
  }

  const { post, user } = data;
  const isCompleted = post.status === 'completed';
  const typeInfo = isCompleted
    ? { label: '已完成', color: 'bg-slate-400' }
    : post.type === 'lost'
    ? { label: '寻物', color: 'bg-red-500' }
    : { label: '招领', color: 'bg-emerald-500' };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-6">
        <button onClick={onBack} className="hover:text-[#1D4ED8] transition-colors">首页</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#0F172A] font-medium truncate max-w-xs">{post.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image + Description + Comments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image */}
          <div className="bg-[#F0F4F8] rounded-2xl overflow-hidden border border-[#CBD5E1]">
            <img
              src={post.imageUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'}
              alt={post.title}
              className="w-full h-64 object-cover"
            />
          </div>

          {/* Post Info */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${typeInfo.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
                    {typeInfo.label}
                  </span>
                  <span className="text-xs text-[#64748B] bg-[#F0F4F8] px-2.5 py-1 rounded-full border border-[#CBD5E1]">
                    {post.location}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#0F172A]">{post.title}</h2>
              </div>
              {!isCompleted && (
                <button
                  onClick={handleMarkCompleted}
                  className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  标记已完成
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-[#F0F4F8] rounded-xl">
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.type === 'lost' ? '丢失时间' : '捡到时间'}
                </p>
                <p className="text-sm font-medium text-[#0F172A]">
                  {new Date(post.lostAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {post.type === 'lost' ? '丢失地点' : '捡到地点'}
                </p>
                <p className="text-sm font-medium text-[#0F172A]">{post.location}</p>
              </div>
            </div>

            <p className="text-sm text-[#0F172A] leading-relaxed">{post.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6 shadow-sm">
            <h3 className="font-semibold text-[#0F172A] mb-4">
              评论区 <span className="text-[#64748B] font-normal text-sm">({comments.length}条)</span>
            </h3>
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-4">暂无评论，来发表第一条评论吧</p>
              ) : (
                comments.map((c: CommentWithUser) => (
                  <div key={c.comment.id} className="flex gap-3">
                    <img
                      src={getAvatarUrl(c.user?.name || '用户', c.user?.avatarUrl)}
                      alt={c.user?.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 bg-[#F0F4F8] rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{c.user?.name || '匿名'}</span>
                        <span className="text-xs text-[#64748B]">{formatTime(c.comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-[#0F172A]">{c.comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {isAuthenticated && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="发表评论或补充信息..."
                    className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleComment}
                      disabled={submitting || !commentText.trim()}
                      className="bg-[#1D4ED8] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {submitting ? '发表中...' : '发表评论'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Publisher Info + Actions + Similar */}
        <div className="space-y-4">
          {/* Publisher Info */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-4">发布者信息</h3>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={getAvatarUrl(user?.name || '用户', user?.avatarUrl)}
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#CBD5E1]"
              />
              <div>
                <p className="font-semibold text-[#0F172A]">{user?.name || '匿名用户'}</p>
                {user?.college && <p className="text-xs text-[#64748B]">{user.college}</p>}
              </div>
            </div>

            {!isCompleted && (
              <button
                onClick={() => onMessage(post.userId)}
                className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md mb-2"
              >
                <MessageCircle className="w-4 h-4" />
                私信TA
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleFavorite}
                className={`flex-1 border font-medium py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isFavorited
                    ? 'border-[#1D4ED8] text-[#1D4ED8] bg-blue-50'
                    : 'border-[#CBD5E1] text-[#64748B] hover:bg-gray-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? '已收藏' : '收藏'}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex-1 border border-[#CBD5E1] text-[#64748B] font-medium py-2.5 rounded-xl text-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                举报
              </button>
            </div>
          </div>

          {/* Similar Posts */}
          {similar.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-3">相似帖子</h3>
              <div className="space-y-3">
                {similar.map((s) => (
                  <div key={s.post.id} className="flex gap-3 cursor-pointer group">
                    <img
                      src={s.post.imageUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop'}
                      alt={s.post.title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                        {s.post.title}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">{s.post.location} · {formatTime(s.post.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-[#0F172A] text-lg mb-4">举报帖子</h3>
            <p className="text-sm text-[#64748B] mb-4">请说明举报原因，当举报达到3次时帖子将自动隐藏。</p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="请描述举报原因（如：广告、不当内容等）"
              className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 border border-[#CBD5E1] text-[#64748B] font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                提交举报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Create Post View
// ============================================
const CreatePostView = ({
  initialType,
  onBack,
  onSuccess,
}: {
  initialType: 'lost' | 'found';
  onBack: () => void;
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState({
    type: initialType,
    title: '',
    description: '',
    location: '',
    lostAt: new Date().toISOString().slice(0, 16),
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description || !form.location || !form.lostAt) {
      setError('请填写所有必填项');
      return;
    }
    setLoading(true);
    try {
      const res = await postsApi.create({
        type: form.type,
        title: form.title,
        description: form.description,
        location: form.location,
        lostAt: new Date(form.lostAt).toISOString(),
        imageUrl: form.imageUrl || undefined,
      });
      if (res.success) {
        toast.success('发布成功！');
        onSuccess();
      } else {
        setError('发布失败，请稍后重试');
      }
    } catch (_err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-6">
        <button onClick={onBack} className="hover:text-[#1D4ED8] transition-colors">首页</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#0F172A] font-medium">发布信息</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#0EA5E9] p-6 text-white">
          <h2 className="text-2xl font-bold">发布信息</h2>
          <p className="text-blue-100 text-sm mt-1">填写详细信息，帮助更多同学找到物品</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">信息类型</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'lost' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.type === 'lost'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-[#CBD5E1] text-[#64748B] hover:border-red-300'
                }`}
              >
                🔍 寻物启事
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'found' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.type === 'found'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                    : 'border-[#CBD5E1] text-[#64748B] hover:border-emerald-300'
                }`}
              >
                📦 招领启事
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder={form.type === 'lost' ? '如：丢失一串钥匙，附有小熊挂件' : '如：捡到一个蓝色保温杯'}
              className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
              详细描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="请详细描述物品特征、颜色、品牌等信息，以便他人识别..."
              className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                {form.type === 'lost' ? '丢失地点' : '捡到地点'} <span className="text-red-500">*</span>
              </label>
              <select
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              >
                <option value="">选择地点</option>
                {['图书馆', '宿舍楼', '食堂', '实验室', '操场/体育馆', '教学楼', '其他'].map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                {form.type === 'lost' ? '丢失时间' : '捡到时间'} <span className="text-red-500">*</span>
              </label>
              <input
                name="lostAt"
                type="datetime-local"
                value={form.lostAt}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
              图片链接 <span className="text-[#64748B] font-normal normal-case">（可选）</span>
            </label>
            <input
              name="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="粘贴图片URL（可选）"
              className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 border border-[#CBD5E1] text-[#64748B] font-medium py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 transition-all duration-200 shadow-md disabled:opacity-60"
            >
              {loading ? '发布中...' : '立即发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// Messages View
// ============================================
const MessagesView = ({
  initialPartnerId,
  onBack,
}: {
  initialPartnerId: string | null;
  onBack: () => void;
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(initialPartnerId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchConv, setSearchConv] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await messagesApi.getConversations();
        if (res.success) setConversations(res.data || []);
      } catch (_err) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedPartnerId) return;
    const loadMessages = async () => {
      try {
        const res = await messagesApi.getMessages(selectedPartnerId);
        if (res.success) setMessages(res.data || []);
      } catch (_err) {
        /* ignore polling errors */
      }
    };
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedPartnerId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartnerId) return;
    setSending(true);
    try {
      const res = await messagesApi.send(selectedPartnerId, newMessage);
      if (res.success) {
        setNewMessage('');
        const msgsRes = await messagesApi.getMessages(selectedPartnerId);
        if (msgsRes.success) setMessages(msgsRes.data || []);
      }
    } catch (_err) {
      toast.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.partnerId === selectedPartnerId);
  const filteredConvs = conversations.filter((c) =>
    c.partner?.name?.toLowerCase().includes(searchConv.toLowerCase())
  );

  const currentUserId = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || '';
    } catch (_err) {
      return '';
    }
  })();

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-6">
        <button onClick={onBack} className="hover:text-[#1D4ED8] transition-colors">首页</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#0F172A] font-medium">消息中心</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden" style={{ height: '520px' }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-72 border-r border-[#CBD5E1] flex flex-col ${selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-[#CBD5E1]">
              <div className="relative">
                <input
                  type="search"
                  value={searchConv}
                  onChange={(e) => setSearchConv(e.target.value)}
                  placeholder="搜索对话..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-[#64748B]">暂无对话</p>
                  <p className="text-xs text-[#64748B] mt-1">在帖子详情页点击「私信TA」开始对话</p>
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <div
                    key={conv.partnerId}
                    onClick={() => setSelectedPartnerId(conv.partnerId)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedPartnerId === conv.partnerId
                        ? 'bg-blue-50 border-l-2 border-[#1D4ED8]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={getAvatarUrl(conv.partner?.name || '用户', conv.partner?.avatarUrl)}
                          alt={conv.partner?.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#0F172A]">{conv.partner?.name || '用户'}</span>
                          <span className="text-xs text-[#64748B]">{formatTime(conv.lastMessage?.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#64748B] truncate">{conv.lastMessage?.content}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          {selectedPartnerId ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-[#CBD5E1] flex items-center gap-3">
                <button
                  onClick={() => setSelectedPartnerId(null)}
                  className="md:hidden p-1 rounded-lg text-[#64748B] hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <img
                  src={getAvatarUrl(selectedConv?.partner?.name || '用户', selectedConv?.partner?.avatarUrl)}
                  alt={selectedConv?.partner?.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{selectedConv?.partner?.name || '用户'}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#64748B]">发送第一条消息开始对话</p>
                  </div>
                ) : (
                  messages.map((msg: MessageItem) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'gap-2'}`}>
                        {!isMine && (
                          <img
                            src={getAvatarUrl(selectedConv?.partner?.name || '用户', selectedConv?.partner?.avatarUrl)}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1"
                          />
                        )}
                        <div
                          className={`text-sm px-4 py-2.5 rounded-2xl max-w-xs ${
                            isMine
                              ? 'bg-[#1D4ED8] text-white rounded-tr-sm'
                              : 'bg-[#F0F4F8] border border-[#CBD5E1] text-[#0F172A] rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-[#CBD5E1]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="输入消息..."
                    className="flex-1 px-3 py-2 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="bg-[#1D4ED8] text-white p-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#64748B] font-medium">选择一个对话</p>
                <p className="text-sm text-[#64748B] mt-1">从左侧选择对话开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Profile View
// ============================================
const ProfileView = ({
  onBack,
  onViewPost,
  onMessage,
  onCreatePost,
}: {
  onBack: () => void;
  onViewPost: (id: string) => void;
  onMessage: (partnerId: string) => void;
  onCreatePost: () => void;
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites' | 'blocks' | 'settings'>('posts');
  const [myPosts, setMyPosts] = useState<PostItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', college: '', phone: '', studentId: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await authApi.me();
        if (res.success) {
          setCurrentUser(res.data.user);
          setEditForm({
            name: res.data.user.name || '',
            college: res.data.user.college || '',
            phone: res.data.user.phone || '',
            studentId: res.data.user.studentId || '',
          });
        }
      } catch (_err) {
        /* ignore */
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === 'posts') {
          const res = await profileApi.getMyPosts();
          if (res.success) setMyPosts(res.data || []);
        } else if (activeTab === 'favorites') {
          const res = await profileApi.getFavorites();
          if (res.success) setFavorites(res.data || []);
        } else if (activeTab === 'blocks') {
          const res = await profileApi.getBlocks();
          if (res.success) setBlocks(res.data || []);
        }
      } catch (_err) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const handleDeletePost = async (id: string) => {
    try {
      const res = await postsApi.delete(id);
      if (res.success) {
        setMyPosts((prev) => prev.filter((p) => p.id !== id));
        toast.success('帖子已删除');
      }
    } catch (_err) {
      toast.error('删除失败');
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      const res = await postsApi.markCompleted(id);
      if (res.success) {
        setMyPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'completed' as const } : p)));
        toast.success('已标记为完成');
      }
    } catch (_err) {
      toast.error('操作失败');
    }
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      await profileApi.unblockUser(blockedId);
      setBlocks((prev) => prev.filter((b) => b.blockedUser?.id !== blockedId));
      toast.success('已解除拉黑');
    } catch (_err) {
      toast.error('操作失败');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await profileApi.updateProfile(editForm);
      if (res.success) {
        setCurrentUser(res.data);
        toast.success('资料已更新');
      }
    } catch (_err) {
      toast.error('更新失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const profileTabs = [
    { id: 'posts', label: '我的发布' },
    { id: 'favorites', label: '我的收藏' },
    { id: 'blocks', label: '黑名单' },
    { id: 'settings', label: '修改资料' },
  ];

  const postStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: '进行中', color: 'bg-amber-100 text-amber-600' },
    completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-600' },
    hidden: { label: '已隐藏', color: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-6">
        <button onClick={onBack} className="hover:text-[#1D4ED8] transition-colors">首页</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#0F172A] font-medium">个人中心</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-3 shadow-sm">
            <div className="flex flex-col items-center py-4 mb-3 border-b border-[#CBD5E1]">
              <img
                src={getAvatarUrl(currentUser?.name || '用户', currentUser?.avatarUrl)}
                alt={currentUser?.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#1D4ED8]/30 mb-2"
              />
              <p className="font-semibold text-[#0F172A]">{currentUser?.name || '加载中...'}</p>
              {currentUser?.college && (
                <p className="text-xs text-[#64748B]">{currentUser.college}</p>
              )}
            </div>
            <nav className="space-y-1">
              {profileTabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === id
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
              >
                退出登录
              </button>
            </nav>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {/* My Posts */}
          {activeTab === 'posts' && (
            <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#CBD5E1] flex items-center justify-between">
                <h3 className="font-semibold text-[#0F172A]">
                  我的发布 <span className="text-[#64748B] font-normal text-sm">({myPosts.length}条)</span>
                </h3>
                <button
                  onClick={onCreatePost}
                  className="bg-[#1D4ED8] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  发布新帖
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : myPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#64748B]">还没有发布过帖子</p>
                  <button
                    onClick={onCreatePost}
                    className="mt-3 text-[#1D4ED8] text-sm hover:underline"
                  >
                    立即发布第一条
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#CBD5E1]">
                  {myPosts.map((post: PostItem) => {
                    const statusInfo = postStatusMap[post.status] || postStatusMap.active;
                    return (
                      <div
                        key={post.id}
                        className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                          post.status === 'completed' ? 'opacity-60' : ''
                        }`}
                      >
                        <img
                          src={post.imageUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop'}
                          alt={post.title}
                          className={`w-14 h-14 rounded-xl object-cover flex-shrink-0 ${
                            post.status === 'completed' ? 'grayscale' : ''
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                post.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {post.type === 'lost' ? '寻物' : '招领'}
                            </span>
                            <span className="text-xs text-[#64748B]">
                              {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p
                            className="text-sm font-medium text-[#0F172A] truncate cursor-pointer hover:text-[#1D4ED8]"
                            onClick={() => onViewPost(post.id)}
                          >
                            {post.title}
                          </p>
                          <p className="text-xs text-[#64748B]">{post.location}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {post.status === 'active' && (
                            <button
                              onClick={() => handleMarkCompleted(post.id)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="标记完成"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-xs text-[#64748B] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#CBD5E1]">
                <h3 className="font-semibold text-[#0F172A]">
                  我的收藏 <span className="text-[#64748B] font-normal text-sm">({favorites.length}条)</span>
                </h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[#64748B]">还没有收藏任何帖子</p>
                </div>
              ) : (
                <div className="divide-y divide-[#CBD5E1]">
                  {favorites.map((fav: FavoriteItem) => {
                    if (!fav.post) return null;
                    return (
                      <div
                        key={fav.post.id}
                        className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => fav.post && onViewPost(fav.post.id)}
                      >
                        <img
                          src={fav.post.imageUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop'}
                          alt={fav.post.title}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                fav.post.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {fav.post.type === 'lost' ? '寻物' : '招领'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#0F172A] truncate hover:text-[#1D4ED8]">
                            {fav.post.title}
                          </p>
                          <p className="text-xs text-[#64748B]">{fav.post.location} · {formatTime(fav.post.createdAt)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Blocks */}
          {activeTab === 'blocks' && (
            <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#CBD5E1]">
                <h3 className="font-semibold text-[#0F172A]">黑名单管理</h3>
                <p className="text-xs text-[#64748B] mt-1">被拉黑的用户的帖子和私信将不会显示给你</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : blocks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#64748B]">黑名单为空</p>
                </div>
              ) : (
                <div className="divide-y divide-[#CBD5E1]">
                  {blocks.map((b: BlockItem) => (
                    <div key={b.blockedUser?.id} className="p-4 flex items-center gap-4">
                      <img
                        src={getAvatarUrl(b.blockedUser?.name || '用户', b.blockedUser?.avatarUrl)}
                        alt={b.blockedUser?.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A]">{b.blockedUser?.name || '用户'}</p>
                        {b.blockedUser?.college && (
                          <p className="text-xs text-[#64748B]">{b.blockedUser.college}</p>
                        )}
                      </div>
                      <button
                        onClick={() => b.blockedUser?.id && handleUnblock(b.blockedUser.id)}
                        className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        解除拉黑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#1D4ED8] to-[#0EA5E9] p-6 text-white">
                <h3 className="text-xl font-bold">修改资料</h3>
                <p className="text-blue-100 text-sm mt-1">更新你的个人信息</p>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">学号</label>
                    <input
                      type="text"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm((p) => ({ ...p, studentId: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">学院</label>
                  <select
                    value={editForm.college}
                    onChange={(e) => setEditForm((p) => ({ ...p, college: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                  >
                    <option value="">选择学院（可选）</option>
                    {['计算机学院', '理学院', '工学院', '文学院', '经济管理学院', '医学院', '法学院', '艺术学院'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                    手机号 <span className="text-[#64748B] font-normal normal-case">（可选）</span>
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#F0F4F8] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 transition-all duration-200 shadow-md disabled:opacity-60"
                >
                  {editLoading ? '保存中...' : '保存修改'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
