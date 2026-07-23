import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Newspaper,
  Users,
  Handshake,
  FileText,
  Bot,
  Sparkles,
  ChevronDown,
  Contact2,
} from "lucide-react";
import logoTree from "@/assets/logo-tree.png";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavLeaf = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: { title: string; url: string }[];
};
type NavItem = NavLeaf | NavGroup;

const isGroup = (i: NavItem): i is NavGroup => "children" in i;

function buildNav(lang: "ar" | "en"): NavItem[] {
  const ar = lang === "ar";
  return [
    { title: ar ? "لوحة التحكم" : "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: ar ? "الأخبار" : "News", url: "/admin", icon: Newspaper },
    { title: ar ? "الشركاء" : "Partners", url: "/admin/partners", icon: Handshake },
    { title: ar ? "الأعضاء" : "Members", url: "/admin/members", icon: Users },
    { title: ar ? "النماذج" : "Forms", url: "/admin/forms", icon: FileText },
    {
      title: "CRM",
      icon: Contact2,
      children: [
        { title: ar ? "تشات بوت" : "Chatbot", url: "/admin/crm/leads" },
        { title: ar ? "طلاب المنصة" : "LMS Students", url: "/admin/crm/students" },
        { title: ar ? "استجابات النماذج" : "Form submissions", url: "/admin/crm/forms" },
      ],
    },
    { title: ar ? "مبادرة المليون" : "Million Initiative", url: "/admin/initiative", icon: Sparkles },
    { title: ar ? "الشات بوت" : "Chatbot", url: "/admin/chatbot", icon: Bot },
  ];
}

export function AdminSidebar() {
  const { lang } = useLang();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const items = buildNav(lang);

  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" side={lang === "ar" ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
            <img
              src={logoTree}
              alt={lang === "ar" ? "شعار الجمعية" : "Association logo"}
              className="h-full w-full object-contain p-1"
            />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold text-sidebar-foreground">
                {lang === "ar" ? "لوحة الإدارة" : "Admin"}
              </span>
              <span className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60"></span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{lang === "ar" ? "التنقل" : "Navigation"}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                isGroup(item) ? (
                  <NestedItem key={item.title} item={item} collapsed={collapsed} isActive={isActive} lang={lang} />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className={cn(
                        "group/nav relative transition-colors",
                        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold",
                        "data-[active=true]:before:absolute data-[active=true]:before:inset-y-1 data-[active=true]:before:w-1 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary",
                        lang === "ar" ? "data-[active=true]:before:right-0" : "data-[active=true]:before:left-0",
                      )}
                    >
                      <Link to={item.url}>
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive(item.url) ? "text-primary" : "text-sidebar-foreground/70",
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function NestedItem({
  item,
  collapsed,
  isActive,
  lang,
}: {
  item: NavGroup;
  collapsed: boolean;
  isActive: (url: string) => boolean;
  lang: "ar" | "en";
}) {
  const anyActive = item.children.some((c) => isActive(c.url));
  const [open, setOpen] = useState(anyActive);
  const showChildren = !collapsed && open;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          onClick={() => setOpen((v) => !v)}
          isActive={anyActive}
          className={cn("group/nav relative transition-colors", "data-[active=true]:font-semibold")}
        >
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              anyActive ? "text-primary" : "text-sidebar-foreground/70",
            )}
          />
          <span className="truncate">{item.title}</span>
          {!collapsed && (
            <ChevronDown
              className={cn("ms-auto h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
            />
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {showChildren && (
        <SidebarMenuSub className="animate-accordion-down">
          {item.children.map((child) => (
            <SidebarMenuSubItem key={child.url}>
              <SidebarMenuSubButton
                asChild
                isActive={isActive(child.url)}
                className={cn(
                  "relative transition-colors",
                  "data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold",
                  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-1 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary",
                  lang === "ar" ? "data-[active=true]:before:right-0" : "data-[active=true]:before:left-0",
                )}
              >
                <Link to={child.url}>
                  <span className="truncate">{child.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </>
  );
}
