"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserOrgs } from "@/lib/supabase/data";
import { ORGS_CHANGED_EVENT } from "@/lib/supabase/events";
import { getOrgChannel } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function OrgAlertListener() {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    const clearChannels = () => {
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
      channelsRef.current = [];
    };

    const syncChannels = async () => {
      clearChannels();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mountedRef.current) return;

      const orgs = await getUserOrgs(supabase, user.id);
      if (!mountedRef.current) return;

      for (const org of orgs) {
        const channel = getOrgChannel(supabase, org.orgId);

        channel
          .on("broadcast", { event: "emergency-alert" }, (payload) => {
            const { userName, incident } = payload.payload;

            // Play alert sound
            try {
              const audio = new Audio("/alert.mp3");
              audio.volume = 0.6;
              audio.play();
            } catch {}

            // Browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Emergency: ${userName} (${org.name})`, {
                body: `${incident.type} - ${incident.description}`,
                icon: "/HawkWatchLogo.png",
                tag: `org-alert-${payload.payload.userId}`,
                requireInteraction: true,
              });
            }
          })
          .subscribe();

        channelsRef.current.push(channel);
      }
    };

    const handleOrgChange = () => {
      void syncChannels();
    };

    void syncChannels();
    window.addEventListener(ORGS_CHANGED_EVENT, handleOrgChange);

    return () => {
      mountedRef.current = false;
      window.removeEventListener(ORGS_CHANGED_EVENT, handleOrgChange);
      clearChannels();
    };
  }, []);

  return null;
}
