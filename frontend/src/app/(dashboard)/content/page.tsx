"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentCard } from "@/components/content/ContentCard";
import { ReviewModal } from "@/components/content/ReviewModal";
import { RejectModal } from "@/components/content/RejectModal";
import { BulkActionBar } from "@/components/content/BulkActionBar";
import { useContent } from "@/hooks/useContent";
import { CONTENT_FILTER_TABS, CONTENT_PLATFORM_CONFIG } from "@/lib/content/config";
import type { ContentItem, ContentStatus, ContentPlatform } from "@/lib/api/content";

const PAGE_SIZE = 20;

export default function ContentQueuePage() {
  const [activeTab, setActiveTab] = useState<ContentStatus | "all">("pending_review");
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null);
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null);

  // Track last filter to detect changes (setState-during-render pattern)
  const [lastTab, setLastTab] = useState(activeTab);
  const [lastPlatform, setLastPlatform] = useState(platformFilter);
  if (activeTab !== lastTab || platformFilter !== lastPlatform) {
    setLastTab(activeTab);
    setLastPlatform(platformFilter);
    setOffset(0);
    setSelectedIds([]);
  }

  const { data, isLoading, isError, refetch } = useContent({
    status: activeTab,
    platform: platformFilter === "all" ? undefined : platformFilter,
    limit: PAGE_SIZE,
    offset,
  });

  // Separate low-cost query for the tab badge count
  const { data: pendingData } = useContent({ status: "pending_review", limit: 1 });
  const pendingCount = pendingData?.total ?? 0;

  const items = data?.items ?? [];
  const pendingItems = items.filter((i) => i.status === "pending_review");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const activeTabConfig = CONTENT_FILTER_TABS.find((t) => t.key === activeTab);

  return (
    <>
      <div className="px-6 py-5">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4">
          <PageHeader
            title="Content Queue"
            subtitle="Review and approve AI-generated content before it publishes"
            className="border-0 p-0"
          />
          {pendingItems.length > 0 && selectedIds.length === 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(pendingItems.map((i) => i.id))}
              className="text-xs font-mono text-[#6B7280] hover:text-white transition-colors mt-1 flex-shrink-0"
            >
              Select All
            </button>
          )}
        </div>

        {/* Filter tabs + platform filter */}
        <div className="flex items-end justify-between border-b border-[#1E2330] mb-4">
          <div className="flex items-end gap-0.5">
            {CONTENT_FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={
                  activeTab === tab.key
                    ? "text-xs font-mono text-white px-3 py-2 border-b-2 border-amber-500 transition-colors"
                    : "text-xs font-mono text-[#6B7280] px-3 py-2 border-b-2 border-transparent hover:text-white transition-colors"
                }
              >
                {tab.label}
                {tab.showCount && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono rounded-[3px] bg-amber-500/20 text-amber-400">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="pb-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as ContentPlatform | "all")}
              className="input-command text-xs w-36 rounded-[4px] px-2 py-1"
            >
              <option value="all">All Platforms</option>
              {(Object.entries(CONTENT_PLATFORM_CONFIG) as [ContentPlatform, { label: string }][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="space-y-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-[#0D0E14] border border-[#1E2330] rounded-[6px] animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-text-muted">Failed to load content queue.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1.5 rounded-[4px] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4">
            {activeTab === "pending_review" ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing needs review"
                description="New AI-generated content will appear here automatically"
              />
            ) : (
              <EmptyState
                title={`No ${activeTabConfig?.label ?? activeTab} content`}
                description={`Content moves here after it is ${activeTab.replace("_", " ")}`}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onSelectToggle={toggleSelect}
                onReview={setReviewItem}
                onQuickReject={(i) => setRejectItem(i)}
              />
            ))}

            {/* Load more */}
            {data?.has_more && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  className="text-xs font-mono text-text-muted hover:text-text-primary border border-[#1E2330] hover:border-[#374151] px-4 py-2 rounded-[4px] transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReviewModal
        item={reviewItem}
        onClose={() => setReviewItem(null)}
        onReject={(item) => {
          setReviewItem(null);
          setRejectItem(item);
        }}
      />

      <RejectModal item={rejectItem} onClose={() => setRejectItem(null)} />

      <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
    </>
  );
}
