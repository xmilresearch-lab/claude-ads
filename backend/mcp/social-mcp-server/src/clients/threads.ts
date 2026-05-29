// Threads API v1.0
// Docs: https://developers.facebook.com/docs/threads

const THREADS_BASE = "https://graph.threads.net/v1.0";

interface ThreadsError {
  error?: { message?: string; code?: number };
}

async function threadsRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const body = (await res.json().catch(() => ({}))) as ThreadsError;
  if (!res.ok) {
    const msg = body.error?.message ?? `Threads API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as unknown as T;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ContainerStatus = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

async function pollContainerStatus(
  containerId: string,
  accessToken: string,
  intervalMs = 5000,
  timeoutMs = 120_000
): Promise<ContainerStatus> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const params = new URLSearchParams({ fields: "status", access_token: accessToken });
    const data = await threadsRequest<{ status: ContainerStatus }>(
      `${THREADS_BASE}/${containerId}?${params}`
    );
    if (data.status === "FINISHED" || data.status === "PUBLISHED") return data.status;
    if (data.status === "ERROR" || data.status === "EXPIRED") return data.status;
    await sleep(intervalMs);
  }
  throw new Error("Threads container processing timed out");
}

export interface ThreadsPost {
  id: string;
  permalink: string;
}

export class ThreadsClient {
  constructor(private accessToken: string) {}

  async getMe(): Promise<{ id: string; username: string; name: string }> {
    const params = new URLSearchParams({
      fields: "id,username,name",
      access_token: this.accessToken,
    });
    return threadsRequest(`${THREADS_BASE}/me?${params}`);
  }

  async createContainer(params: {
    userId: string;
    mediaType: "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL";
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    isCarouselItem?: boolean;
    children?: string[];
    replyControl?: "everyone" | "accounts_you_follow" | "mentioned_only";
    replyToId?: string;
  }): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      media_type: params.mediaType,
      access_token: this.accessToken,
    };
    if (params.text) body["text"] = params.text;
    if (params.imageUrl) body["image_url"] = params.imageUrl;
    if (params.videoUrl) body["video_url"] = params.videoUrl;
    if (params.isCarouselItem) body["is_carousel_item"] = true;
    if (params.children?.length) body["children"] = params.children.join(",");
    if (params.replyControl) body["reply_control"] = params.replyControl;
    if (params.replyToId) body["reply_to_id"] = params.replyToId;

    return threadsRequest<{ id: string }>(`${THREADS_BASE}/${params.userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async getContainerStatus(containerId: string): Promise<{
    status: ContainerStatus;
    error_message?: string;
  }> {
    const params = new URLSearchParams({
      fields: "status",
      access_token: this.accessToken,
    });
    const data = await threadsRequest<{ status: ContainerStatus; error_message?: string }>(
      `${THREADS_BASE}/${containerId}?${params}`
    );
    return data;
  }

  async publish(params: {
    userId: string;
    creationId: string;
  }): Promise<ThreadsPost> {
    const data = await threadsRequest<{ id: string }>(
      `${THREADS_BASE}/${params.userId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: params.creationId,
          access_token: this.accessToken,
        }),
      }
    );
    const mediaId = data.id;
    const p = new URLSearchParams({
      fields: "id,permalink",
      access_token: this.accessToken,
    });
    const media = await threadsRequest<{ id: string; permalink: string }>(
      `${THREADS_BASE}/${mediaId}?${p}`
    );
    return { id: mediaId, permalink: media.permalink };
  }

  async createCarouselPost(params: {
    userId: string;
    items: { mediaType: "IMAGE" | "VIDEO"; url: string }[];
    text?: string;
    replyControl?: "everyone" | "accounts_you_follow" | "mentioned_only";
  }): Promise<ThreadsPost> {
    const childIds: string[] = [];
    for (const item of params.items) {
      const child = await this.createContainer({
        userId: params.userId,
        mediaType: item.mediaType,
        isCarouselItem: true,
        ...(item.mediaType === "IMAGE"
          ? { imageUrl: item.url }
          : { videoUrl: item.url }),
      });
      if (item.mediaType === "VIDEO") {
        const status = await pollContainerStatus(child.id, this.accessToken);
        if (status === "ERROR" || status === "EXPIRED") {
          throw new Error(`Video container ${status.toLowerCase()} during processing`);
        }
      }
      childIds.push(child.id);
    }
    const parent = await this.createContainer({
      userId: params.userId,
      mediaType: "CAROUSEL",
      text: params.text,
      children: childIds,
      replyControl: params.replyControl,
    });
    return this.publish({ userId: params.userId, creationId: parent.id });
  }

  async replyToThread(params: {
    userId: string;
    replyToId: string;
    text: string;
    mediaType?: "TEXT" | "IMAGE";
    imageUrl?: string;
  }): Promise<ThreadsPost> {
    const container = await this.createContainer({
      userId: params.userId,
      mediaType: params.mediaType ?? "TEXT",
      text: params.text,
      imageUrl: params.imageUrl,
      replyToId: params.replyToId,
    });
    return this.publish({ userId: params.userId, creationId: container.id });
  }

  async getThreads(params?: {
    userId?: string;
    limit?: number;
    after?: string;
  }): Promise<{
    data: { id: string; text?: string; permalink: string; timestamp: string }[];
    paging?: { cursors: { before: string; after: string }; next?: string };
  }> {
    const userId = params?.userId ?? "me";
    const p = new URLSearchParams({
      fields: "id,text,permalink,timestamp",
      access_token: this.accessToken,
    });
    if (params?.limit) p.set("limit", String(params.limit));
    if (params?.after) p.set("after", params.after);
    return threadsRequest(`${THREADS_BASE}/${userId}/threads?${p}`);
  }

  async getInsights(params: {
    mediaId: string;
    metric: string[];
  }): Promise<{ id: string; values: { value: number }[] }[]> {
    const p = new URLSearchParams({
      metric: params.metric.join(","),
      access_token: this.accessToken,
    });
    const data = await threadsRequest<{
      data: { id: string; values: { value: number }[] }[];
    }>(`${THREADS_BASE}/${params.mediaId}/insights?${p}`);
    return data.data;
  }
}

export function createThreadsClient(accessToken: string): ThreadsClient {
  return new ThreadsClient(accessToken);
}
