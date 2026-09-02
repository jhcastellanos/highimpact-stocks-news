import { Suspense } from "react";
import { LoadingLabel } from "@/frontend/components/LoadingLabel";
import { NewsFeed } from "@/frontend/components/NewsFeed";

export default function LivePage() {
  return (
    <Suspense fallback={<LoadingLabel />}>
      <NewsFeed />
    </Suspense>
  );
}
