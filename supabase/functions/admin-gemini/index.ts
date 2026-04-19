import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restricts cross-origin requests to trusted domains
const allowedOrigins = [
  'https://id-preview--03dda6d1-e2fa-4e50-a1bd-5e8508198fa1.lovable.app',
  'https://shortly.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ============ ADMIN EXECUTION TOOLS ============
const adminTools = [
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "Execute a SELECT query on the database to read data. Use this to check users, videos, analytics, etc.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name to query (videos, profiles, user_roles, etc.)" },
          select: { type: "string", description: "Columns to select, e.g. 'id, user_id, status'" },
          filters: { 
            type: "array", 
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "lt", "gte", "lte", "like", "ilike"] },
                value: { type: "string" }
              }
            },
            description: "Filters to apply"
          },
          limit: { type: "number", description: "Max rows to return" }
        },
        required: ["table", "select"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_user",
      description: "Delete a user account and all associated data (profile, videos, etc.)",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The UUID of the user to delete" },
          reason: { type: "string", description: "Reason for deletion" }
        },
        required: ["user_id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_video",
      description: "Delete a specific video by ID",
      parameters: {
        type: "object",
        properties: {
          video_id: { type: "string", description: "The UUID of the video to delete" },
          reason: { type: "string", description: "Reason for deletion" }
        },
        required: ["video_id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ban_user",
      description: "Ban a user by setting their activity status to 'banned'",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The UUID of the user to ban" },
          reason: { type: "string", description: "Reason for ban" }
        },
        required: ["user_id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "unban_user",
      description: "Unban a user by setting their activity status back to 'active'",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The UUID of the user to unban" }
        },
        required: ["user_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_role",
      description: "Assign a role (admin, moderator, user) to a user",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The UUID of the user" },
          role: { type: "string", enum: ["admin", "moderator", "user"], description: "Role to assign" }
        },
        required: ["user_id", "role"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_role",
      description: "Remove a role from a user",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The UUID of the user" },
          role: { type: "string", enum: ["admin", "moderator", "user"], description: "Role to remove" }
        },
        required: ["user_id", "role"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_alert",
      description: "Create a new AI alert for the admin dashboard",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Alert title" },
          description: { type: "string", description: "Alert description" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Alert severity" },
          alert_type: { type: "string", description: "Type of alert (security, performance, content, etc.)" }
        },
        required: ["title", "description", "severity", "alert_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_app_stats",
      description: "Get comprehensive app statistics including users, videos, engagement, revenue",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fuzzy_search_users",
      description: "Search for users by username or display name with fuzzy matching (handles typos)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (username or display name)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fuzzy_search_videos",
      description: "Search for videos by caption or tags with fuzzy matching",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "security_scan",
      description: "Run a security scan to detect suspicious activity, bot traffic, fake accounts",
      parameters: {
        type: "object",
        properties: {
          scan_type: { type: "string", enum: ["full", "bots", "fake_accounts", "spam"], description: "Type of security scan" }
        },
        required: ["scan_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_video_status",
      description: "Update a video's status or visibility",
      parameters: {
        type: "object",
        properties: {
          video_id: { type: "string", description: "Video ID" },
          status: { type: "string", enum: ["processing", "ready", "failed", "removed"], description: "New status" },
          is_public: { type: "boolean", description: "Whether video is public" }
        },
        required: ["video_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_revenue_report",
      description: "Get revenue and earnings report",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to look back" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upload_status",
      description: "Get the current status of all video uploads in the app (processing, completed, failed)",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["all", "processing", "ready", "failed"], description: "Filter by status" }
        },
        required: []
      }
    }
  }
];

// ============ SECURITY CONSTANTS ============
const ALLOWED_OPERATORS = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike'] as const;
const ALLOWED_TABLES = ['videos', 'profiles', 'user_roles', 'likes', 'comments', 'follows', 'gifts', 'earnings', 'notifications', 'ai_alerts', 'ai_tasks', 'admin_chat_messages', 'audience_analytics', 'watch_time', 'view_tracking', 'blocked_users', 'muted_users', 'saves', 'privacy_settings', 'rate_limits', 'activity_log'] as const;

// Per-table column allowlists for defense-in-depth
const TABLE_COLUMNS: Record<string, string[]> = {
  videos: ['id', 'user_id', 'caption', 'description', 'status', 'video_type', 'video_url', 'thumbnail_url', 'view_count', 'like_count', 'comment_count', 'share_count', 'save_count', 'gift_count', 'total_watch_time', 'is_public', 'is_trending', 'allow_comments', 'allow_duet', 'tags', 'music_title', 'duration', 'location', 'age_restriction', 'created_at', 'updated_at'],
  profiles: ['id', 'user_id', 'username', 'display_name', 'bio', 'avatar_url', 'cover_url', 'activity_status', 'creator_score', 'trust_level', 'total_views', 'total_likes', 'total_followers', 'total_following', 'total_gifts', 'total_earnings', 'website', 'instagram', 'twitter', 'youtube', 'tiktok', 'created_at', 'updated_at'],
  user_roles: ['id', 'user_id', 'role', 'created_at'],
  likes: ['id', 'user_id', 'video_id', 'created_at'],
  comments: ['id', 'user_id', 'video_id', 'content', 'like_count', 'created_at'],
  follows: ['id', 'follower_id', 'following_id', 'created_at'],
  gifts: ['id', 'sender_id', 'receiver_id', 'video_id', 'gift_type', 'gift_value', 'created_at'],
  earnings: ['id', 'user_id', 'video_id', 'amount', 'earning_type', 'created_at'],
  notifications: ['id', 'user_id', 'from_user_id', 'video_id', 'type', 'message', 'is_read', 'metadata', 'created_at'],
  ai_alerts: ['id', 'alert_type', 'severity', 'title', 'description', 'is_resolved', 'resolved_at', 'metadata', 'created_at'],
  ai_tasks: ['id', 'task_name', 'description', 'is_active', 'last_run_at', 'next_run_at', 'metadata', 'created_at', 'updated_at'],
  admin_chat_messages: ['id', 'user_id', 'role', 'content', 'metadata', 'created_at'],
  audience_analytics: ['id', 'video_id', 'watch_hour', 'country', 'region', 'age_group', 'gender', 'created_at'],
  watch_time: ['id', 'user_id', 'video_id', 'watch_duration', 'session_id', 'created_at'],
  view_tracking: ['id', 'user_id', 'video_id', 'created_at'],
  blocked_users: ['id', 'blocker_id', 'blocked_id', 'created_at'],
  muted_users: ['id', 'muter_id', 'muted_id', 'created_at'],
  saves: ['id', 'user_id', 'video_id', 'created_at'],
  privacy_settings: ['id', 'user_id', 'profile_visibility', 'who_can_message', 'who_can_gift', 'profile_locked', 'show_fans_list', 'show_following_list', 'show_gifts', 'show_gift_history', 'show_activity', 'created_at', 'updated_at'],
  rate_limits: ['id', 'user_id', 'action_type', 'action_count', 'window_start'],
  activity_log: ['id', 'user_id', 'target_user_id', 'video_id', 'activity_type', 'metadata', 'created_at'],
};

// Sanitize error messages for client response (keep details in server logs only)
function sanitizeError(error: any, context: string): string {
  // Log full error server-side for debugging
  console.error(`[${context}] Full error:`, error);
  // Return generic message to client
  return `Operation failed: ${context}`;
}

// ============ VALIDATION HELPERS ============
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

function validateUUIDs(args: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (args[key] !== undefined && !isValidUUID(args[key])) {
      return `Invalid ${key} format`;
    }
  }
  return null;
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ============ TOOL EXECUTION ENGINE ============
async function executeToolCall(adminClient: any, toolName: string, args: any): Promise<any> {
  // Log tool execution (server-side only, no sensitive data in client response)
  console.log(`Executing tool: ${toolName}`);
  
  switch (toolName) {
    case "execute_sql_query": {
      // Validate table name against allowlist
      if (!ALLOWED_TABLES.includes(args.table)) {
        return { error: `Invalid table specified` };
      }

      // Validate SELECT columns against per-table allowlist
      const allowedColumns = TABLE_COLUMNS[args.table] || [];
      if (args.select && args.select !== '*') {
        const selectColumns = args.select.split(',').map((c: string) => c.trim());
        if (!selectColumns.every((col: string) => allowedColumns.includes(col) || col === '*')) {
          return { error: `Invalid column in SELECT` };
        }
      }
      
      let query = adminClient.from(args.table).select(args.select);
      if (args.filters) {
        for (const filter of args.filters) {
          // Runtime validation of filter operator against allowlist
          if (!ALLOWED_OPERATORS.includes(filter.operator)) {
            return { error: `Invalid filter operator` };
          }
          // Validate filter column against per-table allowlist
          if (!allowedColumns.includes(filter.column)) {
            return { error: `Invalid filter column` };
          }
          query = query[filter.operator](filter.column, filter.value);
        }
      }
      if (args.limit) query = query.limit(Math.min(args.limit, 100)); // Cap limit
      else query = query.limit(50);
      const { data, error } = await query;
      if (error) return { error: sanitizeError(error, 'query') };
      return { success: true, data, count: data?.length || 0 };
    }
    
    case "delete_user": {
      const uuidErr = validateUUIDs(args, ['user_id']);
      if (uuidErr) return { error: uuidErr };
      // Delete user's data cascade
      await adminClient.from('videos').delete().eq('user_id', args.user_id);
      await adminClient.from('likes').delete().eq('user_id', args.user_id);
      await adminClient.from('comments').delete().eq('user_id', args.user_id);
      await adminClient.from('follows').delete().or(`follower_id.eq.${args.user_id},following_id.eq.${args.user_id}`);
      await adminClient.from('profiles').delete().eq('user_id', args.user_id);
      await adminClient.from('user_roles').delete().eq('user_id', args.user_id);
      
      // Create alert for audit trail
      await adminClient.from('ai_alerts').insert({
        alert_type: 'user_action',
        severity: 'high',
        title: 'User Deleted',
        description: `User ${args.user_id} was deleted. Reason: ${args.reason}`
      });
      
      return { success: true, message: `User ${args.user_id} and all related data deleted.` };
    }
    
    case "delete_video": {
      const uuidErr = validateUUIDs(args, ['video_id']);
      if (uuidErr) return { error: uuidErr };
      const { error } = await adminClient.from('videos').delete().eq('id', args.video_id);
      if (error) return { error: sanitizeError(error, 'delete_video') };
      
      await adminClient.from('ai_alerts').insert({
        alert_type: 'content_action',
        severity: 'medium',
        title: 'Video Deleted',
        description: `Video ${args.video_id} was deleted. Reason: ${args.reason}`
      });
      
      return { success: true, message: `Video deleted successfully.` };
    }
    
    case "ban_user": {
      const uuidErr = validateUUIDs(args, ['user_id']);
      if (uuidErr) return { error: uuidErr };
      const { error } = await adminClient
        .from('profiles')
        .update({ activity_status: 'banned' })
        .eq('user_id', args.user_id);
      if (error) return { error: sanitizeError(error, 'ban_user') };
      
      await adminClient.from('ai_alerts').insert({
        alert_type: 'user_action',
        severity: 'high',
        title: 'User Banned',
        description: `User ${args.user_id} was banned. Reason: ${args.reason}`
      });
      
      return { success: true, message: `User banned successfully.` };
    }
    
    case "unban_user": {
      const uuidErr = validateUUIDs(args, ['user_id']);
      if (uuidErr) return { error: uuidErr };
      const { error } = await adminClient
        .from('profiles')
        .update({ activity_status: 'active' })
        .eq('user_id', args.user_id);
      if (error) return { error: sanitizeError(error, 'unban_user') };
      return { success: true, message: `User unbanned successfully.` };
    }
    
    case "assign_role": {
      const uuidErr = validateUUIDs(args, ['user_id']);
      if (uuidErr) return { error: uuidErr };
      const { error } = await adminClient.from('user_roles').upsert({
        user_id: args.user_id,
        role: args.role
      }, { onConflict: 'user_id,role' });
      if (error) return { error: sanitizeError(error, 'assign_role') };
      return { success: true, message: `Role '${args.role}' assigned to user.` };
    }
    
    case "remove_role": {
      const uuidErr = validateUUIDs(args, ['user_id']);
      if (uuidErr) return { error: uuidErr };
      const { error } = await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', args.user_id)
        .eq('role', args.role);
      if (error) return { error: sanitizeError(error, 'remove_role') };
      return { success: true, message: `Role '${args.role}' removed from user.` };
    }
    
    case "create_alert": {
      const { error } = await adminClient.from('ai_alerts').insert({
        alert_type: args.alert_type,
        severity: args.severity,
        title: args.title,
        description: args.description
      });
      if (error) return { error: sanitizeError(error, 'create_alert') };
      return { success: true, message: `Alert created successfully.` };
    }
    
    case "get_app_stats": {
      const [videos, profiles, gifts, earnings, alerts] = await Promise.all([
        adminClient.from('videos').select('id, status, video_type, view_count, like_count, created_at'),
        adminClient.from('profiles').select('id, activity_status, total_views, total_likes, total_earnings, created_at'),
        adminClient.from('gifts').select('id, gift_value, created_at'),
        adminClient.from('earnings').select('id, amount, earning_type, created_at'),
        adminClient.from('ai_alerts').select('id, severity, is_resolved')
      ]);
      
      const totalViews = profiles.data?.reduce((sum: number, p: any) => sum + (p.total_views || 0), 0) || 0;
      const totalLikes = profiles.data?.reduce((sum: number, p: any) => sum + (p.total_likes || 0), 0) || 0;
      const totalGiftValue = gifts.data?.reduce((sum: number, g: any) => sum + (g.gift_value || 0), 0) || 0;
      const totalEarnings = earnings.data?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0;
      
      return {
        success: true,
        stats: {
          users: {
            total: profiles.data?.length || 0,
            active: profiles.data?.filter((p: any) => p.activity_status === 'active').length || 0,
            banned: profiles.data?.filter((p: any) => p.activity_status === 'banned').length || 0
          },
          videos: {
            total: videos.data?.length || 0,
            ready: videos.data?.filter((v: any) => v.status === 'ready').length || 0,
            processing: videos.data?.filter((v: any) => v.status === 'processing').length || 0,
            failed: videos.data?.filter((v: any) => v.status === 'failed').length || 0,
            shorts: videos.data?.filter((v: any) => v.video_type === 'short').length || 0,
            longs: videos.data?.filter((v: any) => v.video_type === 'long').length || 0
          },
          engagement: {
            totalViews,
            totalLikes,
            totalGiftValue
          },
          revenue: {
            totalEarnings: totalEarnings.toFixed(2)
          },
          alerts: {
            total: alerts.data?.length || 0,
            unresolved: alerts.data?.filter((a: any) => !a.is_resolved).length || 0,
            critical: alerts.data?.filter((a: any) => a.severity === 'critical' && !a.is_resolved).length || 0
          }
        }
      };
    }
    
    case "fuzzy_search_users": {
      // Strict sanitization: only allow alphanumeric, spaces, hyphens
      const query = (args.query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, '')
        .trim()
        .slice(0, 100);
      if (!query) {
        return { error: 'Invalid search query', users: [], count: 0 };
      }
      // Search username first, then display_name, merge results
      const { data: usernameResults, error: err1 } = await adminClient
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, activity_status, total_followers')
        .ilike('username', `%${query}%`)
        .limit(20);
      const { data: displayNameResults, error: err2 } = await adminClient
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, activity_status, total_followers')
        .ilike('display_name', `%${query}%`)
        .limit(20);
      const error = err1 || err2;
      // Merge and deduplicate by user_id
      const seen = new Set<string>();
      const data = [...(usernameResults || []), ...(displayNameResults || [])].filter((p: any) => {
        if (seen.has(p.user_id)) return false;
        seen.add(p.user_id);
        return true;
      }).slice(0, 20);
      if (error) return { error: sanitizeError(error, 'fuzzy_search_users') };
      return { success: true, users: data, count: data?.length || 0 };
    }
    
    case "fuzzy_search_videos": {
      const query = (args.query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, '')
        .trim()
        .slice(0, 100);
      if (!query) {
        return { error: 'Invalid search query', videos: [], count: 0 };
      }
      const { data, error } = await adminClient
        .from('videos')
        .select('id, user_id, caption, video_type, status, view_count, like_count, created_at')
        .ilike('caption', `%${query}%`)
        .limit(30);
      if (error) return { error: sanitizeError(error, 'fuzzy_search_videos') };
      return { success: true, videos: data, count: data?.length || 0 };
    }
    
    case "security_scan": {
      const results: any = { scan_type: args.scan_type, findings: [] };
      
      if (args.scan_type === 'full' || args.scan_type === 'fake_accounts') {
        // Check for accounts with suspicious patterns
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('user_id, username, display_name, total_views, total_likes, total_followers, created_at');
        
        // Find accounts with no content but high followers (potential bots)
        const { data: videos } = await adminClient.from('videos').select('user_id');
        const usersWithVideos = new Set(videos?.map((v: any) => v.user_id) || []);
        
        const suspiciousAccounts = profiles?.filter((p: any) => 
          !usersWithVideos.has(p.user_id) && (p.total_followers > 100 || p.total_likes > 50)
        ) || [];
        
        if (suspiciousAccounts.length > 0) {
          results.findings.push({
            type: 'suspicious_accounts',
            severity: 'high',
            count: suspiciousAccounts.length,
            details: suspiciousAccounts.slice(0, 5).map((a: any) => ({
              user_id: a.user_id,
              username: a.username,
              followers: a.total_followers,
              likes: a.total_likes
            }))
          });
        }
      }
      
      if (args.scan_type === 'full' || args.scan_type === 'spam') {
        // Check for rapid content creation (potential spam)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentVideos } = await adminClient
          .from('videos')
          .select('user_id, created_at')
          .gte('created_at', oneHourAgo);
        
        // Group by user
        const userVideoCounts: Record<string, number> = {};
        recentVideos?.forEach((v: any) => {
          userVideoCounts[v.user_id] = (userVideoCounts[v.user_id] || 0) + 1;
        });
        
        const spammers = Object.entries(userVideoCounts)
          .filter(([_, count]) => count > 10)
          .map(([userId, count]) => ({ user_id: userId, videos_last_hour: count }));
        
        if (spammers.length > 0) {
          results.findings.push({
            type: 'potential_spam',
            severity: 'medium',
            count: spammers.length,
            details: spammers
          });
        }
      }
      
      if (results.findings.length === 0) {
        results.message = "No suspicious activity detected.";
      }
      
      return { success: true, ...results };
    }
    
    case "update_video_status": {
      const uuidErr = validateUUIDs(args, ['video_id']);
      if (uuidErr) return { error: uuidErr };
      const updateData: any = {};
      if (args.status) updateData.status = args.status;
      if (args.is_public !== undefined) updateData.is_public = args.is_public;
      
      const { error } = await adminClient
        .from('videos')
        .update(updateData)
        .eq('id', args.video_id);
      if (error) return { error: sanitizeError(error, 'update_video_status') };
      return { success: true, message: `Video updated successfully.` };
    }
    
    case "get_revenue_report": {
      const days = clampNumber(args.days, 1, 365, 30);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: earnings } = await adminClient
        .from('earnings')
        .select('*')
        .gte('created_at', startDate);
      
      const { data: gifts } = await adminClient
        .from('gifts')
        .select('*')
        .gte('created_at', startDate);
      
      const byType: Record<string, number> = {};
      earnings?.forEach((e: any) => {
        byType[e.earning_type] = (byType[e.earning_type] || 0) + parseFloat(e.amount || 0);
      });
      
      const totalGiftValue = gifts?.reduce((sum: number, g: any) => sum + (g.gift_value || 0), 0) || 0;
      const totalEarnings = Object.values(byType).reduce((sum, val) => sum + val, 0);
      
      return {
        success: true,
        report: {
          period_days: days,
          total_earnings: totalEarnings.toFixed(2),
          by_type: byType,
          total_gifts: gifts?.length || 0,
          total_gift_value: totalGiftValue,
          transactions: earnings?.length || 0
        }
      };
    }
    
    case "get_upload_status": {
      const filter = args.status_filter || "all";
      let query = adminClient.from('videos').select('id, user_id, caption, status, video_type, created_at').order('created_at', { ascending: false }).limit(50);
      
      if (filter !== "all") {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      if (error) return { error: sanitizeError(error, 'get_upload_status') };
      
      const summary = {
        total: data?.length || 0,
        processing: data?.filter((v: any) => v.status === 'processing').length || 0,
        ready: data?.filter((v: any) => v.status === 'ready').length || 0,
        failed: data?.filter((v: any) => v.status === 'failed').length || 0,
      };
      
      return { 
        success: true, 
        summary,
        recent_uploads: data?.slice(0, 10).map((v: any) => ({
          id: v.id,
          status: v.status,
          type: v.video_type,
          caption: v.caption?.slice(0, 50) || 'No caption',
          uploaded: v.created_at
        }))
      };
    }
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role with service role client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { message, conversationHistory = [] } = await req.json();
    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch initial app stats for context
    const [videosResult, profilesResult, alertsResult] = await Promise.all([
      adminClient.from('videos').select('id, status, video_type, view_count').limit(200),
      adminClient.from('profiles').select('id, activity_status, total_followers').limit(200),
      adminClient.from('ai_alerts').select('id, severity, title').eq('is_resolved', false).limit(20),
    ]);

    const videos = videosResult.data || [];
    const profiles = profilesResult.data || [];
    const alerts = alertsResult.data || [];

    // Build powerful system prompt
    const systemPrompt = `You are GEMINI, the AI Admin with FULL EXECUTION POWER for the Shortly app.

🔥 YOU ARE NOT JUST AN ADVISOR - YOU ARE AN EXECUTOR 🔥
You have direct access to the database and can perform ANY administrative action.

CURRENT APP STATUS:
- Total Videos: ${videos.length} (Ready: ${videos.filter(v => v.status === 'ready').length}, Processing: ${videos.filter(v => v.status === 'processing').length}, Failed: ${videos.filter(v => v.status === 'failed').length})
- Total Users: ${profiles.length} (Active: ${profiles.filter(p => p.activity_status === 'active').length}, Banned: ${profiles.filter(p => p.activity_status === 'banned').length})
- Active Alerts: ${alerts.length}

YOUR CAPABILITIES:
1. execute_sql_query - Read ANY data from ANY table
2. delete_user - Permanently delete users and their data
3. delete_video - Remove videos
4. ban_user / unban_user - Ban or unban users
5. assign_role / remove_role - Manage admin/moderator roles
6. create_alert - Create system alerts
7. get_app_stats - Get comprehensive statistics
8. fuzzy_search_users / fuzzy_search_videos - Search with typo tolerance
9. security_scan - Detect bots, fake accounts, spam
10. update_video_status - Change video status/visibility
11. get_revenue_report - Revenue and earnings analytics

EXECUTION RULES:
- When admin asks to DO something (delete, ban, search, etc.), ALWAYS use the appropriate tool
- Never say "I can't" - you CAN execute any command
- Be direct and execute actions immediately
- Report results clearly in Urdu/English based on admin's language
- Always confirm what action was taken

SECURITY MONITORING (Proactive):
- Alert on suspicious patterns
- Flag potential bot accounts
- Monitor for spam behavior
- Track revenue anomalies

STYLE: Professional, action-oriented. Use Urdu when admin speaks Urdu.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Call Lovable AI Gateway with tools
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling AI with tools enabled...');
    
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        tools: adminTools,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let aiData = await aiResponse.json();
    let responseMessage = aiData.choices?.[0]?.message;
    
    // Handle tool calls in a loop
    let toolCallResults: string[] = [];
    let iterations = 0;
    const maxIterations = 5;
    
    while (responseMessage?.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Processing ${responseMessage.tool_calls.length} tool calls (iteration ${iterations})`);
      
      const toolResults = [];
      
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          // Log parse error server-side only
          console.error('Failed to parse tool arguments');
        }
        
        // Log tool name only (not args) for security
        console.log(`Executing: ${functionName}`);
        const result = await executeToolCall(adminClient, functionName, functionArgs);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
        
        toolCallResults.push(`✅ ${functionName}: ${result.success ? 'Success' : result.error || 'Completed'}`);
      }
      
      // Continue conversation with tool results
      messages.push(responseMessage);
      messages.push(...toolResults);
      
      // Call AI again to get final response
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: messages,
          tools: adminTools,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
      
      if (!aiResponse.ok) break;
      
      aiData = await aiResponse.json();
      responseMessage = aiData.choices?.[0]?.message;
    }

    const finalMessage = responseMessage?.content || 
      (toolCallResults.length > 0 ? `Actions Executed:\n${toolCallResults.join('\n')}` : 'No response generated');

    // Save conversation (non-blocking)
    adminClient.from('admin_chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: finalMessage, metadata: { tool_calls: toolCallResults } }
    ]).then(() => {});

    return new Response(
      JSON.stringify({ 
        message: finalMessage, 
        alerts: alerts.length,
        actions_executed: toolCallResults 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log full error server-side for debugging, but don't expose to client
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again.' }), 
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
