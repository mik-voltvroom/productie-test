"use client";

import Script from "next/script";

declare global {
  interface Window {
    merchantwidget?: {
      start: (options: {
        merchant_id: number;
        position: "RIGHT_BOTTOM" | "LEFT_BOTTOM";
        region?: string;
        sideMargin?: number;
        bottomMargin?: number;
        mobileSideMargin?: number;
        mobileBottomMargin?: number;
      }) => void;
    };
  }
}

export function GoogleMerchantBadge() {
  return (
    <Script
      id="merchantWidgetScript"
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      strategy="lazyOnload"
      onLoad={() => {
        window.merchantwidget?.start({
          merchant_id: 5838389580,
          position: "RIGHT_BOTTOM",
          region: "NL",
          sideMargin: 24,
          bottomMargin: 24,
          mobileSideMargin: 16,
          mobileBottomMargin: 92,
        });
      }}
    />
  );
}
