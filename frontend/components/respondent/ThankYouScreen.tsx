"use client";

export function ThankYouScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-6 h-[50vh]">
      <div className="w-20 h-20 bg-[var(--tf-accent)] text-white rounded-full flex items-center justify-center text-4xl mb-8">
        ✓
      </div>
      <h2 className="tf-question-title mb-6">
        {message}
      </h2>
    </div>
  );
}
