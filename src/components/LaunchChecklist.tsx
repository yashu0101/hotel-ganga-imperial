import { SITE_CONFIG } from "@/lib/config";
import { missingLaunchDetails } from "@/lib/hotel-content";

// Staff-only reminder of guest-facing details that are still missing. The public site hides
// these gaps instead of showing placeholders, so this is where they stay visible.
export default function LaunchChecklist({ rooms }: { rooms: { name: string; sample?: boolean; hidden?: boolean }[] }) {
  const missing = missingLaunchDetails({ contact: SITE_CONFIG.contact, rooms: rooms.filter(r => !r.hidden) });
  if (!missing.length) return null;
  return (
    <details
      style={{
        background: "#1a2035",
        border: "1px solid #6b5a35",
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 24,
      }}
    >
      <summary style={{ cursor: "pointer", color: "#e2c68e" }}>
        Launch checklist: {missing.length} guest-facing detail{missing.length === 1 ? "" : "s"} still missing
      </summary>
      <p style={{ fontSize: ".85rem", color: "#c0beb7", margin: "12px 0 8px" }}>
        These are hidden from guests until provided. Contact details are environment variables and need a redeploy.
      </p>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: ".85rem", color: "#ede6da", lineHeight: 1.8 }}>
        {missing.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
