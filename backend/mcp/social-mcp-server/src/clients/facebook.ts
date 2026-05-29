// Meta Graph API v19.0
// Covers both Facebook Pages and Instagram Business accounts.
// Instagram requires a linked Facebook Page; tokens are page-level.

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

interface GraphError {
  error?: { message?: string; code?: number; type?: string };
}

async function graphRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const body = (await res.json().catch(() => ({}))) as GraphError;
  if (!res.ok) {
    const msg = body.error?.message ?? `Graph API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as unknown as T;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

export interface FacebookPostResult {
  id: string;
  post_url: string;
}

export interface InstagramMediaResult {
  id: string;
  permalink: string;
}

type ContainerStatus =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollContainerStatus(
  containerId: string,
  accessToken: string,
  intervalMs = 5000,
  timeoutMs = 120_000
): Promise<ContainerStatus> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: accessToken,
    });
    const data = await graphRequest<{ status_code: ContainerStatus }>(
      `${GRAPH_BASE}/${containerId}?${params}`
    );
    if (data.status_code === "FINISHED" || data.status_code === "PUBLISHED") {
      return data.status_code;
    }
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      return data.status_code;
    }
    await sleep(intervalMs);
  }
  throw new Error("Container processing timed out after 2 minutes");
}

export class FacebookClient {
  constructor(private userAccessToken: string) {}

  async exchangeForLongLived(
    appId: string,
    appSecret: string
  ): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: this.userAccessToken,
    });
    const data = await graphRequest<{ access_token: string }>(
      `${GRAPH_BASE}/oauth/access_token?${params}`
    );
    return data.access_token;
  }

  async getPages(): Promise<FacebookPage[]> {
    const params = new URLSearchParams({
      fields: "id,name,access_token,instagram_business_account",
      access_token: this.userAccessToken,
    });
    const data = await graphRequest<{ data: FacebookPage[] }>(
      `${GRAPH_BASE}/me/accounts?${params}`
    );
    return data.data;
  }

  async createPagePost(params: {
    pageId: string;
    pageAccessToken: string;
    message: string;
    link?: string;
    imageUrl?: string;
    scheduled_publish_time?: number;
    published?: boolean;
  }): Promise<FacebookPostResult> {
    const {
      pageId,
      pageAccessToken,
      message,
      link,
      imageUrl,
      scheduled_publish_time,
      published = true,
    } = params;

    let endpoint: string;
    const body: Record<string, unknown> = { access_token: pageAccessToken };

    if (imageUrl) {
      endpoint = `${GRAPH_BASE}/${pageId}/photos`;
      body["url"] = imageUrl;
      body["caption"] = message;
      body["published"] = published;
    } else {
      endpoint = `${GRAPH_BASE}/${pageId}/feed`;
      body["message"] = message;
      if (link) body["link"] = link;
      body["published"] = published;
    }
    if (scheduled_publish_time !== undefined) {
      body["scheduled_publish_time"] = scheduled_publish_time;
    }

    const data = await graphRequest<{ id: string }>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parts = data.id.split("_");
    const postUrl =
      parts.length === 2
        ? `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
        : `https://www.facebook.com/${data.id}`;

    return { id: data.id, post_url: postUrl };
  }

  async getPageInsights(params: {
    pageId: string;
    pageAccessToken: string;
    metric: string[];
    period: "day" | "week" | "days_28";
  }): Promise<{ metric: string; values: { value: number; end_time: string }[] }[]> {
    const { pageId, pageAccessToken, metric, period } = params;
    const p = new URLSearchParams({
      metric: metric.join(","),
      period,
      access_token: pageAccessToken,
    });
    const data = await graphRequest<{
      data: { name: string; values: { value: number; end_time: string }[] }[];
    }>(`${GRAPH_BASE}/${pageId}/insights?${p}`);
    return data.data.map((d) => ({ metric: d.name, values: d.values }));
  }

  // ── Instagram via Graph API ────────────────────────────────────

  async createInstagramContainer(params: {
    igUserId: string;
    pageAccessToken: string;
    mediaType: "IMAGE" | "REELS" | "CAROUSEL_ALBUM";
    imageUrl?: string;
    videoUrl?: string;
    caption?: string;
    locationId?: string;
    isCarouselItem?: boolean;
    children?: string[];
  }): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      media_type: params.mediaType,
      access_token: params.pageAccessToken,
    };
    if (params.caption) body["caption"] = params.caption;
    if (params.imageUrl) body["image_url"] = params.imageUrl;
    if (params.videoUrl) body["video_url"] = params.videoUrl;
    if (params.locationId) body["location_id"] = params.locationId;
    if (params.isCarouselItem) body["is_carousel_item"] = true;
    if (params.children?.length) body["children"] = params.children.join(",");

    return graphRequest<{ id: string }>(
      `${GRAPH_BASE}/${params.igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  }

  async getContainerStatus(
    containerId: string,
    pageAccessToken: string
  ): Promise<{ status: ContainerStatus; status_code?: string }> {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: pageAccessToken,
    });
    const data = await graphRequest<{ status_code: ContainerStatus }>(
      `${GRAPH_BASE}/${containerId}?${params}`
    );
    return { status: data.status_code };
  }

  async publishInstagramContainer(params: {
    igUserId: string;
    pageAccessToken: string;
    creationId: string;
  }): Promise<InstagramMediaResult> {
    const data = await graphRequest<{ id: string }>(
      `${GRAPH_BASE}/${params.igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: params.creationId,
          access_token: params.pageAccessToken,
        }),
      }
    );
    const mediaId = data.id;
    const p = new URLSearchParams({
      fields: "id,permalink",
      access_token: params.pageAccessToken,
    });
    const media = await graphRequest<{ id: string; permalink: string }>(
      `${GRAPH_BASE}/${mediaId}?${p}`
    );
    return { id: mediaId, permalink: media.permalink };
  }

  async createInstagramPost(params: {
    igUserId: string;
    pageAccessToken: string;
    imageUrl: string;
    caption?: string;
    locationId?: string;
  }): Promise<InstagramMediaResult> {
    const container = await this.createInstagramContainer({
      igUserId: params.igUserId,
      pageAccessToken: params.pageAccessToken,
      mediaType: "IMAGE",
      imageUrl: params.imageUrl,
      caption: params.caption,
      locationId: params.locationId,
    });
    return this.publishInstagramContainer({
      igUserId: params.igUserId,
      pageAccessToken: params.pageAccessToken,
      creationId: container.id,
    });
  }

  async createInstagramReel(params: {
    igUserId: string;
    pageAccessToken: string;
    videoUrl: string;
    caption?: string;
    shareToFeed?: boolean;
  }): Promise<InstagramMediaResult> {
    const body: Record<string, unknown> = {
      media_type: "REELS",
      video_url: params.videoUrl,
      access_token: params.pageAccessToken,
    };
    if (params.caption) body["caption"] = params.caption;
    if (params.shareToFeed !== undefined)
      body["share_to_feed"] = params.shareToFeed;

    const container = await graphRequest<{ id: string }>(
      `${GRAPH_BASE}/${params.igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const status = await pollContainerStatus(
      container.id,
      params.pageAccessToken,
      5000,
      120_000
    );
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Reel container ${status.toLowerCase()} during processing`);
    }

    return this.publishInstagramContainer({
      igUserId: params.igUserId,
      pageAccessToken: params.pageAccessToken,
      creationId: container.id,
    });
  }

  async createInstagramCarousel(params: {
    igUserId: string;
    pageAccessToken: string;
    imageUrls: string[];
    caption?: string;
  }): Promise<InstagramMediaResult> {
    const childIds: string[] = [];
    for (const imageUrl of params.imageUrls) {
      const child = await this.createInstagramContainer({
        igUserId: params.igUserId,
        pageAccessToken: params.pageAccessToken,
        mediaType: "IMAGE",
        imageUrl,
        isCarouselItem: true,
      });
      childIds.push(child.id);
    }
    const parent = await this.createInstagramContainer({
      igUserId: params.igUserId,
      pageAccessToken: params.pageAccessToken,
      mediaType: "CAROUSEL_ALBUM",
      caption: params.caption,
      children: childIds,
    });
    return this.publishInstagramContainer({
      igUserId: params.igUserId,
      pageAccessToken: params.pageAccessToken,
      creationId: parent.id,
    });
  }

  async getInstagramMedia(
    igUserId: string,
    pageAccessToken: string
  ): Promise<
    {
      id: string;
      caption?: string;
      media_type: string;
      permalink: string;
      timestamp: string;
    }[]
  > {
    const params = new URLSearchParams({
      fields: "id,caption,media_type,permalink,timestamp",
      access_token: pageAccessToken,
    });
    const data = await graphRequest<{
      data: {
        id: string;
        caption?: string;
        media_type: string;
        permalink: string;
        timestamp: string;
      }[];
    }>(`${GRAPH_BASE}/${igUserId}/media?${params}`);
    return data.data;
  }

  async getInstagramInsights(params: {
    mediaId: string;
    pageAccessToken: string;
    metric: string[];
  }): Promise<{ id: string; values: { value: number }[] }[]> {
    const p = new URLSearchParams({
      metric: params.metric.join(","),
      access_token: params.pageAccessToken,
    });
    const data = await graphRequest<{
      data: { id: string; values: { value: number }[] }[];
    }>(`${GRAPH_BASE}/${params.mediaId}/insights?${p}`);
    return data.data;
  }
}

export function createFacebookClient(accessToken: string): FacebookClient {
  return new FacebookClient(accessToken);
}
