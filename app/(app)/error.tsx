"use client";

// Shown if a screen hits an unexpected problem. The user's data is safe in
// this browser; "Try again" redraws the screen.

import { Button, ButtonLink, Card, ScreenHeader } from "@/components/ui";

export default function ScreenError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <ScreenHeader title="Something went wrong" />
      <div className="px-5">
        <Card>
          <p className="text-body">
            This screen didn&rsquo;t load properly. Your recipes and meals are still saved on this
            device.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Back to Today
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}
