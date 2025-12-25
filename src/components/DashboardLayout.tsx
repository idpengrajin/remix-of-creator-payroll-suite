import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  ShoppingCart,
  Settings,
  FileText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  User,
  Package,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "CREATOR", "INVESTOR"],
  },
  {
    title: "Performa",
    icon: TrendingUp,
    roles: ["CREATOR", "ADMIN"],
    children: [
      {
        title: "Sesi Live",
        href: "/sesi-live",
        icon: Clock,
        roles: ["CREATOR", "ADMIN"],
      },
      {
        title: "Sales",
        href: "/sales",
        icon: ShoppingCart,
        roles: ["ADMIN", "CREATOR", "INVESTOR"],
      },
      {
        title: "Konten",
        href: "/konten",
        icon: FileText,
        roles: ["CREATOR", "ADMIN"],
      },
    ],
  },
  {
    title: "Manajemen",
    icon: Users,
    roles: ["ADMIN", "INVESTOR"],
    children: [
      {
        title: "Payroll",
        href: "/payroll",
        icon: DollarSign,
        roles: ["ADMIN", "INVESTOR"],
      },
      {
        title: "Kreator",
        href: "/kreator",
        icon: Users,
        roles: ["ADMIN", "INVESTOR"],
      },
      {
        title: "Inventaris",
        href: "/inventaris",
        icon: Package,
        roles: ["ADMIN", "INVESTOR"],
      },
    ],
  },
  {
    title: "Bisnis",
    icon: DollarSign,
    roles: ["ADMIN", "INVESTOR"],
    children: [
      {
        title: "Keuangan",
        href: "/keuangan",
        icon: TrendingUp,
        roles: ["ADMIN", "INVESTOR"],
      },
      {
        title: "Konfigurasi",
        href: "/konfigurasi",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: TrendingUp,
    roles: ["ADMIN", "CREATOR", "INVESTOR"],
  },
  {
    title: "Profil",
    href: "/profil",
    icon: User,
    roles: ["ADMIN", "CREATOR", "INVESTOR"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, userRole, userName, loading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Create a deep copy of navItems to avoid mutating the original array
  const filteredNavItems = navItems
    .filter((item) => {
      if (!userRole) return false;
      return item.roles.includes(userRole);
    })
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) =>
            userRole ? child.roles.includes(userRole) : false
          ),
        };
      }
      return item;
    });

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar - Desktop */}
        <Sidebar collapsible="icon" className="hidden md:flex">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">Agensi Afiliasi</span>
          </div>
          
          <SidebarContent>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-1 px-2"
            >
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                
                // Item without children (direct link)
                if (!item.children) {
                  const isActive = location.pathname === item.href;
                  return (
                    <motion.div key={item.href} variants={itemVariants} whileHover={{ x: 3 }}>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link 
                              to={item.href!}
                              className={cn(
                                "transition-all duration-200",
                                isActive && "border-l-2 border-primary bg-primary/10 text-primary font-medium"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </motion.div>
                  );
                }

                // Item with children (collapsible group)
                const hasActiveChild = item.children.some(
                  (child) => child.href === location.pathname
                );

                return (
                  <motion.div key={item.title} variants={itemVariants}>
                    <SidebarGroup>
                      <Collapsible defaultOpen={hasActiveChild}>
                        <CollapsibleTrigger asChild>
                          <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-2 py-1.5 transition-colors">
                            <Icon className="h-4 w-4 mr-2" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            <SidebarGroupContent>
                              <SidebarMenuSub>
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const isActive = location.pathname === child.href;
                                  
                                  return (
                                    <motion.div key={child.href} variants={itemVariants} whileHover={{ x: 3 }}>
                                      <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild isActive={isActive}>
                                          <Link 
                                            to={child.href!}
                                            className={cn(
                                              "transition-all duration-200",
                                              isActive && "border-l-2 border-primary bg-primary/10 text-primary font-medium"
                                            )}
                                          >
                                            <ChildIcon className="h-4 w-4" />
                                            <span>{child.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    </motion.div>
                                  );
                                })}
                              </SidebarMenuSub>
                            </SidebarGroupContent>
                          </motion.div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarGroup>
                  </motion.div>
                );
              })}
            </motion.div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="hidden md:flex" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <div className="flex items-center gap-2 md:hidden">
                  <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-sm">Agensi Afiliasi</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="font-medium">{userName} ({userRole})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <nav className="fixed top-16 left-0 bottom-0 w-64 bg-card border-r p-4 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  
                  // Item without children
                  if (!item.children) {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href!}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start transition-all duration-200",
                            isActive && "border-l-2 border-primary bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.title}
                        </Button>
                      </Link>
                    );
                  }

                  // Item with children
                  const hasActiveChild = item.children.some(
                    (child) => child.href === location.pathname
                  );

                  return (
                    <Collapsible key={item.title} defaultOpen={hasActiveChild}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between hover:bg-accent"
                        >
                          <span className="flex items-center">
                            <Icon className="h-4 w-4 mr-2" />
                            {item.title}
                          </span>
                          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 pl-6 pt-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive = location.pathname === child.href;
                          
                          return (
                            <Link
                              key={child.href}
                              to={child.href!}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <Button
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                  "w-full justify-start transition-all duration-200",
                                  isActive && "border-l-2 border-primary bg-primary/10 text-primary font-medium"
                                )}
                              >
                                <ChildIcon className="h-4 w-4 mr-2" />
                                {child.title}
                              </Button>
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
