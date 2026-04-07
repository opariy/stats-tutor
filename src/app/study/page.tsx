import { Suspense } from "react";
import StudyChat from "./study-chat";

export default function StudyPage() {
  // Skip auth for MVP - assign group randomly on client
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <StudyChat />
    </Suspense>
  );
}
