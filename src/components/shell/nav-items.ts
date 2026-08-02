import {
  Building2,
  FileBarChart,
  FileText,
  Images,
  LayoutDashboard,
  LogIn,
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
  { href: "/site-visits", label: "Site Visits", icon: LogIn },
  { href: "/reports", label: "Reports", icon: FileBarChart },
] as const;
