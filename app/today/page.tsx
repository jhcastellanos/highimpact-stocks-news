"use client";

import { Suspense } from "react";
import { LoadingLabel } from "@/frontend/components/LoadingLabel";
import { NewsFeed } from "@/frontend/components/NewsFeed";

export default function TodayPage() {
  return (
    <Suspense fallback={<LoadingLabel />}>
      <NewsFeed today />
    </Suspense>
  );
}
