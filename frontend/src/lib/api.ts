import { API_BASE_URL } from '@/config/constants';
import type {
  ApiResponse,
  PostWithUser,
  Post,
  CommentWithUser,
  Message,
  Conversation,
  User,
  BlockedUserEntry,
} from '@shared/types/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });
  return response.json() as Promise<ApiResponse<T>>;
};

// ============================================
// Posts API
// ============================================
export const postsApi = {
  getAll: (params: {
    type?: string;
    location?: string;
    timeFilter?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.location && params.location !== 'all') query.set('location', params.location);
    if (params.timeFilter && params.timeFilter !== 'all') query.set('timeFilter', params.timeFilter);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<PostWithUser[]>(`/api/posts${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => request<PostWithUser>(`/api/posts/${id}`),

  create: (data: {
    type: string;
    title: string;
    description: string;
    location: string;
    lostAt: string;
    imageUrl?: string;
  }) =>
    request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Post>) =>
    request<Post>(`/api/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/posts/${id}`, { method: 'DELETE' }),

  markCompleted: (id: string) =>
    request<Post>(`/api/posts/${id}/complete`, { method: 'POST' }),

  getComments: (id: string) => request<CommentWithUser[]>(`/api/posts/${id}/comments`),

  addComment: (id: string, content: string, parentId?: string) =>
    request<Comment>(`/api/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    }),

  report: (id: string, reason: string) =>
    request<unknown>(`/api/posts/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  toggleFavorite: (id: string) =>
    request<{ favorited: boolean }>(`/api/posts/${id}/favorite`, { method: 'POST' }),

  checkFavorite: (id: string) =>
    request<{ favorited: boolean }>(`/api/posts/${id}/favorite`),

  getSimilar: (id: string) => request<PostWithUser[]>(`/api/posts/${id}/similar`),
};

// ============================================
// Messages API
// ============================================
export const messagesApi = {
  getConversations: () => request<Conversation[]>('/api/messages/conversations'),

  getMessages: (partnerId: string) => request<Message[]>(`/api/messages/${partnerId}`),

  send: (receiverId: string, content: string, postId?: string) =>
    request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content, postId }),
    }),

  getUnreadCount: () => request<{ count: number }>('/api/messages/unread-count'),
};

// ============================================
// Profile API
// ============================================
export const profileApi = {
  getMyPosts: () => request<Post[]>('/api/profile/posts'),

  getFavorites: () => request<PostWithUser[]>('/api/profile/favorites'),

  getBlocks: () =>
    request<BlockedUserEntry[]>('/api/profile/blocks'),

  blockUser: (userId: string) =>
    request<unknown>(`/api/profile/blocks/${userId}`, { method: 'POST' }),

  unblockUser: (userId: string) =>
    request<unknown>(`/api/profile/blocks/${userId}`, { method: 'DELETE' }),

  updateProfile: (data: Partial<User>) =>
    request<User>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// Auth API
// ============================================
export const authApi = {
  me: () => request<{ user: User }>('/api/auth/me'),
};
