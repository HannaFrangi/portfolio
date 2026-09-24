"use client";

import dynamic from "next/dynamic";

// WebGL only runs in the browser; the page reads fine without it.
const Stage = dynamic(() => import("./three/Stage"), { ssr: false });

export default function StageMount() {
  return <Stage />;
}
