// Re-export all shared API types so existing imports from '@/types' continue to work
export type {
  ApiResponse,
  User,
  SafeUser,
  SignupRequest,
  LoginRequest,
  AuthResponse,
  MeResponse,
  PostType,
  PostStatus,
  Post,
  PostUser,
  PostWithUser,
  CreatePostRequest,
  UpdatePostRequest,
  Comment,
  CommentUser,
  CommentWithUser,
  AddCommentRequest,
  Message,
  ConversationPartner,
  Conversation,
  SendMessageRequest,
  UnreadCountResponse,
  ReportRequest,
  FavoriteResponse,
  BlockedUserEntry,
  TabFilter,
  LocationFilter,
  TimeFilter,
  PostsQueryParams,
  UpdateProfileRequest,
  UploadResponse,
} from '@shared/types/api';

// ============================================
// Frontend-only / UI-specific Types
// ============================================
export type AppView = 'home' | 'post-detail' | 'create-post' | 'messages' | 'profile';

// Aliases kept for backward compatibility
export type MessageItem = import('@shared/types/api').Message;

export type ConversationItem = import('@shared/types/api').Conversation;

export type PostItem = import('@shared/types/api').Post;

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
