import type { NavItem } from "~/types";

export const navItems: Array<NavItem> = [
  { title: "About", url: "/#intro" },
  { title: "Contact", url: "/#contact" },
];

export const mobileOnlyNavItems: Array<NavItem> = [
  { title: "Privacy Policy", url: "/privacy-policy" }
];