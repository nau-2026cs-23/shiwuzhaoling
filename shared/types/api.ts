// ============================================
// Shared API Types - Single source of truth
// Used by both backend routes and frontend API service
// ============================================

// ============================================
// Generic API Response
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

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

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  college?: string;
  avatarUrl?: string;
}

// ============================================
// Auth Types
// ============================================
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentId?: string;
  phone?: string;
  college?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: SafeUser;
}

export interface MeResponse {
  user: SafeUser;
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

export interface PostUser {
  id: string;
  name: string;
  avatarUrl?: string;
  college?: string;
}

export interface PostWithUser {
  post: Post;
  user: PostUser | null;
}

export interface CreatePostRequest {
  type: string;
  title: string;
  description: string;
  location: string;
  lostAt: string;
  imageUrl?: string;
}

export interface UpdatePostRequest {
  type?: string;
  title?: string;
  description?: string;
  location?: string;
  lostAt?: string;
  imageUrl?: string;
  status?: string;
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

export interface CommentUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CommentWithUser {
  comment: Comment;
  user: CommentUser | null;
}

export interface AddCommentRequest {
  content: string;
  parentId?: string;
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

export interface ConversationPartner {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Conversation {
  partnerId: string;
  partner: ConversationPartner | null;
  lastMessage: Message;
  unreadCount: number;
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  postId?: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ============================================
// Report Types
// ============================================
export interface ReportRequest {
  reason: string;
}

// ============================================
// Favorite Types
// ============================================
export interface FavoriteResponse {
  favorited: boolean;
}

// ============================================
// Block Types
// ============================================
export interface BlockedUserEntry {
  block: unknown;
  blockedUser: {
    id: string;
    name: string;
    avatarUrl?: string;
    college?: string;
  } | null;
}

// ============================================
// Filter Types
// ============================================
export type TabFilter = 'all' | 'lost' | 'found';
export type LocationFilter = 'all' | string;
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

export interface PostsQueryParams {
  type?: string;
  location?: string;
  timeFilter?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================
// Profile Types
// ============================================
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  college?: string;
  studentId?: string;
  avatarUrl?: string;
}

// ============================================
// Upload Types
// ============================================
export interface UploadResponse {
  url: string;
  key: string;
}
