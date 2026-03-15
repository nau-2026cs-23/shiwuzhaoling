// ============================================
// User Types
// ============================================
export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  college?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Post Types
// ============================================
export type PostType = 'lost' | 'found';
export type PostStatus = 'active' | 'completed' | 'hidden';

export interface Post {
  id: string;
  userId: string;
  type: PostType;
  title: string;
  description: string;
  location: string;
  lostAt: string;
  imageUrl?: string;
  status: PostStatus;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithUser {
  post: Post;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    college?: string;
  } | null;
}

// ============================================
// Comment Types
// ============================================
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: string;
}

export interface CommentWithUser {
  comment: Comment;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

// ============================================
// Message Types
// ============================================
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  partnerId: string;
  partner: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  lastMessage: Message;
  unreadCount: number;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================
// Filter Types
// ============================================
export type TabFilter = 'all' | 'lost' | 'found';
export type LocationFilter = 'all' | '图书馆' | '宿舍楼' | '食堂' | '实验室' | '操场/体育馆' | '教学楼';
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

// ============================================
// View Types
// ============================================
export type AppView = 'home' | 'post-detail' | 'create-post' | 'messages' | 'profile';

// ============================================
// Alias / UI-specific Types
// ============================================
export type MessageItem = Message;

export interface ConversationItem {
  partnerId: string;
  partner: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  lastMessage: Message;
  unreadCount: number;
}

export interface PostItem {
  id: string;
  userId: string;
  type: PostType;
  title: string;
  description: string;
  location: string;
  lostAt: string;
  imageUrl?: string;
  status: PostStatus;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteItem {
  post: PostItem | null;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

export interface BlockItem {
  blockedUser: {
    id: string;
    name: string;
    avatarUrl?: string;
    college?: string;
  } | null;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  college?: string;
  avatarUrl?: string;
}
