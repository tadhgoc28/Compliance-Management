import {
  Building2,
  FileText,
  Images,
  LayoutDashboard,
  Map,
  ShieldAlert,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Asset Register", icon: Building2 },
  { href: "/map", label: "Map", icon: Map },
  { href: "/findings", label: "Findings", icon: ShieldAlert },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/gallery", label: "Photo Gallery", icon: Images },
] as const;
