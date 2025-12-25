import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Building2, 
  BarChart3, 
  Shield, 
  Zap,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const features = [
  {
    icon: Clock,
    title: "Real-time Tracking",
    description: "Lacak sesi live kreator secara real-time dengan check-in/check-out otomatis"
  },
  {
    icon: DollarSign,
    title: "Auto Payroll",
    description: "Kalkulasi gaji otomatis berdasarkan performa dan aturan komisi yang fleksibel"
  },
  {
    icon: Building2,
    title: "Multi-Agency",
    description: "Kelola beberapa agensi dalam satu platform dengan isolasi data yang aman"
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Pantau GMV, komisi, dan performa kreator dengan visualisasi data real-time"
  },
  {
    icon: Users,
    title: "Creator Management",
    description: "Kelola profil kreator, aturan bonus, dan target bulanan dengan mudah"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Row-level security dan isolasi data per agensi untuk keamanan maksimal"
  }
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Gratis",
    description: "Cocok untuk agensi yang baru memulai",
    features: [
      "Hingga 5 kreator",
      "Tracking sesi live",
      "Kalkulasi payroll dasar",
      "Dashboard analytics",
      "Email support"
    ],
    cta: "Mulai Gratis",
    popular: false
  },
  {
    name: "Agency",
    price: "Rp 499.000",
    period: "/bulan",
    description: "Untuk agensi yang sedang berkembang",
    features: [
      "Hingga 50 kreator",
      "Semua fitur Starter",
      "Aturan komisi kustom",
      "Multi-user access",
      "Priority support",
      "Export laporan"
    ],
    cta: "Coba 14 Hari",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Untuk agensi besar dengan kebutuhan khusus",
    features: [
      "Unlimited kreator",
      "Semua fitur Agency",
      "Multi-agency support",
      "API access",
      "Dedicated support",
      "Custom integrations"
    ],
    cta: "Hubungi Sales",
    popular: false
  }
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">CreatorPay</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost">Masuk</Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90">
                  Coba Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              Platform #1 untuk Agensi Kreator
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Otomatisasi <span className="text-primary">Payroll Kreator</span> & Afiliasi
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Kelola sesi live, hitung komisi otomatis, dan proses payroll dalam satu platform terpadu untuk agensi TikTok & Shopee Affiliate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="h-12 px-8 text-base">
                  Coba Gratis Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Sudah Punya Akun? Masuk
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: "500+", label: "Kreator Aktif" },
              { value: "50+", label: "Agensi" },
              { value: "Rp 2M+", label: "GMV Diproses" },
              { value: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Fitur Lengkap</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Platform lengkap untuk mengelola kreator, tracking performa, dan proses payroll secara otomatis
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pilih Paket yang Tepat
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mulai gratis, upgrade sesuai kebutuhan agensi Anda
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border/50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">Populer</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block">
                    <Button 
                      className="w-full mt-6" 
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap Meningkatkan Efisiensi Agensi Anda?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Bergabung dengan ratusan agensi yang sudah mempercayakan pengelolaan kreator mereka kepada CreatorPay
          </p>
          <Link to="/auth">
            <Button size="lg" className="h-12 px-8 text-base">
              Mulai Sekarang - Gratis
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">CreatorPay</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Tentang Kami</a>
              <a href="#" className="hover:text-foreground transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-foreground transition-colors">Syarat & Ketentuan</a>
              <a href="#" className="hover:text-foreground transition-colors">Kontak</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 CreatorPay. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}