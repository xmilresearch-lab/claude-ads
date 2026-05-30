// TikTok Content Posting API v2
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started

const TIKTOK_BASE = "https://open.tiktokapis.com/v2";

interface TikTokApiResponse<T> {
  data: T;
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

async function tiktokPost<T>(
  path: string,
  accessToken: string,
  body?: unknown,
  fields?: string
): Promise<T> {
  const url = fields
    ? `${TIKTOK_BASE}${path}?fields=${fields}`
    : `${TIKTOK_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({
    data: {},
    error: { code: "PARSE_ERROR", message: "Failed to parse response", log_id: "" },
  }))) as TikTokApiResponse<T>;
  if (json.error?.code && json.error.code !== "ok") {
    throw new Error(`TikTok API error [${json.error.code}]: ${json.error.message}`);
  }
  return json.data;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TikTokVideoPost {
  publish_id: string;
  share_url?: string;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
}

type PublishStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_DOWNLOAD"
  | "SEND_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

export class TikTokClient {
  constructor(private accessToken: string) {}

  async getUserInfo(): Promise<TikTokUserInfo> {
    return tiktokPost<TikTokUserInfo>(
      "/user/info/",
      this.accessToken,
      { fields: ["open_id", "display_name", "avatar_url", "follower_count"] },
      "open_id,display_name,avatar_url,follower_count"
    );
  }

  async getCreatorInfo(): Promise<{
    creator_avatar_url: string;
    creator_nickname: string;
    creator_username: string;
    privacy_level_options: string[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  }> {
    return tiktokPost(
      "/post/publish/creator_info/query/",
      this.accessToken
    );
  }

  async publishVideoFromUrl(params: {
    videoUrl: string;
    title: string;
    privacyLevel?: string;
    disableComment?: boolean;
    disableDuet?: boolean;
    disableStitch?: boolean;
    videoCoverTimestampMs?: number;
  }): Promise<TikTokVideoPost> {
    const postInfo: Record<string, unknown> = {
      title: params.title.slice(0, 2200),
      privacy_level: params.privacyLevel ?? "PUBLIC_TO_EVERYONE",
      disable_comment: params.disableComment ?? false,
      disable_duet: params.disableDuet ?? false,
      disable_stitch: params.disableStitch ?? false,
    };
    if (params.videoCoverTimestampMs !== undefined) {
      postInfo["video_cover_timestamp_ms"] = params.videoCoverTimestampMs;
    }

    const initData = await tiktokPost<{ publish_id: string }>(
      "/post/publish/video/init/",
      this.accessToken,
      {
        post_info: postInfo,
        source_info: {
          source: "PULL_FROM_URL",
          video_url: params.videoUrl,
        },
      }
    );

    const publishId = initData.publish_id;
    const deadline = Date.now() + 5 * 60_000;

    while (Date.now() < deadline) {
      await sleep(10_000);
      const status = await this.getPublishStatus(publishId);
      if (status.status === "PUBLISH_COMPLETE") {
        return {
          publish_id: publishId,
          share_url: status.share_url,
        };
      }
      if (status.status === "FAILED") {
        throw new Error(
          `TikTok publish failed: ${status.fail_reason ?? "unknown reason"}`
        );
      }
    }
    throw new Error("TikTok publish timed out after 5 minutes");
  }

  async initVideoUpload(params: {
    videoSizeBytes: number;
    chunkSize: number;
    totalChunkCount: number;
  }): Promise<{ publish_id: string; upload_url: string }> {
    return tiktokPost<{ publish_id: string; upload_url: string }>(
      "/post/publish/video/init/",
      this.accessToken,
      {
        post_info: { privacy_level: "SELF_ONLY" },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: params.videoSizeBytes,
          chunk_size: params.chunkSize,
          total_chunk_count: params.totalChunkCount,
        },
      }
    );
  }

  async getPublishStatus(publishId: string): Promise<{
    status: PublishStatus;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    share_url?: string;
  }> {
    return tiktokPost(
      "/post/publish/status/fetch/",
      this.accessToken,
      { publish_id: publishId }
    );
  }

  async getVideos(params?: {
    cursor?: number;
    max_count?: number;
  }): Promise<{
    videos: { id: string; title: string; create_time: number; share_url: string }[];
    cursor: number;
    has_more: boolean;
  }> {
    const body: Record<string, unknown> = {
      fields: ["id", "title", "create_time", "share_url"],
    };
    if (params?.cursor !== undefined) body["cursor"] = params.cursor;
    if (params?.max_count !== undefined) body["max_count"] = params.max_count;
    return tiktokPost(
      "/video/list/",
      this.accessToken,
      body
    );
  }

  async getVideoAnalytics(videoId: string): Promise<{
    id: string;
    like_count: number;
    comment_count: number;
    share_count: number;
    view_count: number;
  }> {
    const data = await tiktokPost<{
      videos: {
        id: string;
        like_count: number;
        comment_count: number;
        share_count: number;
        view_count: number;
      }[];
    }>(
      "/video/query/",
      this.accessToken,
      {
        filters: { video_ids: [videoId] },
        fields: ["id", "like_count", "comment_count", "share_count", "view_count"],
      }
    );
    const video = data.videos?.[0];
    if (!video) throw new Error(`Video ${videoId} not found`);
    return video;
  }
}

export function createTikTokClient(accessToken: string): TikTokClient {
  return new TikTokClient(accessToken);
}
