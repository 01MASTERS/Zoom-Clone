import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Zoom - Video Conferencing, Web Meetings & Chat",
  description: "Seamless video conferencing clone replicating Zoom web client workflows, scheduling, and real-time audio/video calls.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
