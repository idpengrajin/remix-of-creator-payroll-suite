import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { TrendingUp, AlertCircle, Building2, UserPlus, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "select" | "login" | "create-agency" | "join-invite";

interface InvitationInfo {
  id: string;
  agency_id: string;
  role: string;
  expires_at: string;
  agency: {
    name: string;
  };
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPending = searchParams.get("pending") === "true";
  const inviteToken = searchParams.get("invite");

  const [mode, setMode] = useState<AuthMode>(inviteToken ? "join-invite" : "select");
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [agencySignupData, setAgencySignupData] = useState({
    email: "",
    password: "",
    name: "",
    agencyName: "",
  });
  const [inviteSignupData, setInviteSignupData] = useState({
    email: "",
    password: "",
    name: "",
  });

  // Fetch invitation info if token is present
  useEffect(() => {
    if (inviteToken) {
      fetchInvitationInfo(inviteToken);
    }
  }, [inviteToken]);

  const fetchInvitationInfo = async (token: string) => {
    setInviteLoading(true);
    setInviteError(null);
    
    try {
      const { data, error } = await supabase
        .from("agency_invitations")
        .select(`
          id,
          agency_id,
          role,
          expires_at,
          used_at,
          agency:agencies (
            name
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setInviteError("Link undangan tidak valid atau sudah tidak berlaku.");
        setMode("select");
        return;
      }

      if (data.used_at) {
        setInviteError("Link undangan ini sudah pernah digunakan.");
        setMode("select");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInviteError("Link undangan ini sudah kedaluwarsa.");
        setMode("select");
        return;
      }

      setInvitationInfo(data as unknown as InvitationInfo);
      setMode("join-invite");
    } catch (error) {
      setInviteError("Terjadi kesalahan saat memvalidasi undangan.");
      setMode("select");
    } finally {
      setInviteLoading(false);
    }
  };

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user && !isPending) {
      navigate("/");
    }
  }, [user, loading, isPending, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success("Login berhasil!");
    }
  };

  const handleAgencySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!agencySignupData.agencyName.trim()) {
      toast.error("Nama agensi wajib diisi");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      agencySignupData.email,
      agencySignupData.password,
      agencySignupData.name,
      {
        isAgencyOwner: true,
        agencyName: agencySignupData.agencyName,
      }
    );

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Agensi berhasil dibuat! Silakan login.");
      setAgencySignupData({ email: "", password: "", name: "", agencyName: "" });
      setMode("login");
    }

    setIsLoading(false);
  };

  const handleInviteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;
    
    setIsLoading(true);

    const { error } = await signUp(
      inviteSignupData.email,
      inviteSignupData.password,
      inviteSignupData.name,
      {
        invitationToken: inviteToken,
      }
    );

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Pendaftaran berhasil! Silakan login.");
      setInviteSignupData({ email: "", password: "", name: "" });
      setMode("login");
    }

    setIsLoading(false);
  };

  const renderModeSelector = () => (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full h-auto p-4 flex flex-col items-start gap-2"
        onClick={() => setMode("login")}
      >
        <div className="flex items-center gap-2 text-primary font-medium">
          <TrendingUp className="h-5 w-5" />
          Sudah Punya Akun
        </div>
        <p className="text-sm text-muted-foreground text-left">
          Login ke akun yang sudah ada
        </p>
      </Button>

      <Button
        variant="outline"
        className="w-full h-auto p-4 flex flex-col items-start gap-2"
        onClick={() => setMode("create-agency")}
      >
        <div className="flex items-center gap-2 text-primary font-medium">
          <Building2 className="h-5 w-5" />
          Daftarkan Agensi Baru
        </div>
        <p className="text-sm text-muted-foreground text-left">
          Buat akun baru dan agensi Anda sendiri
        </p>
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Untuk Staff/Kreator
          </span>
        </div>
      </div>

      <p className="text-sm text-center text-muted-foreground">
        Staff dan kreator harus mendaftar melalui link undangan dari pemilik agensi.
      </p>
    </div>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="nama@contoh.com"
          value={loginData.email}
          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={loginData.password}
          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Loading..." : "Login"}
      </Button>
    </form>
  );

  const renderAgencySignupForm = () => (
    <form onSubmit={handleAgencySignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agency-name">Nama Agensi</Label>
        <Input
          id="agency-name"
          type="text"
          placeholder="Nama Agensi Anda"
          value={agencySignupData.agencyName}
          onChange={(e) => setAgencySignupData({ ...agencySignupData, agencyName: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nama Lengkap</Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="Nama Anda"
          value={agencySignupData.name}
          onChange={(e) => setAgencySignupData({ ...agencySignupData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="nama@contoh.com"
          value={agencySignupData.email}
          onChange={(e) => setAgencySignupData({ ...agencySignupData, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          value={agencySignupData.password}
          onChange={(e) => setAgencySignupData({ ...agencySignupData, password: e.target.value })}
          required
          minLength={6}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Anda akan menjadi Owner dari agensi ini dan dapat mengundang kreator.
      </p>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Loading..." : "Buat Agensi"}
      </Button>
    </form>
  );

  const renderInviteSignupForm = () => (
    <div className="space-y-4">
      {inviteLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : inviteError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{inviteError}</AlertDescription>
        </Alert>
      ) : invitationInfo ? (
        <>
          <Alert>
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Anda diundang untuk bergabung ke <strong>{invitationInfo.agency.name}</strong> sebagai <strong>{invitationInfo.role}</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleInviteSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nama Lengkap</Label>
              <Input
                id="invite-name"
                type="text"
                placeholder="Nama Anda"
                value={inviteSignupData.name}
                onChange={(e) => setInviteSignupData({ ...inviteSignupData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nama@contoh.com"
                value={inviteSignupData.email}
                onChange={(e) => setInviteSignupData({ ...inviteSignupData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={inviteSignupData.password}
                onChange={(e) => setInviteSignupData({ ...inviteSignupData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : "Daftar & Bergabung"}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "Login";
      case "create-agency":
        return "Daftarkan Agensi Baru";
      case "join-invite":
        return "Bergabung via Undangan";
      default:
        return "Selamat Datang";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login":
        return "Masuk ke akun Anda";
      case "create-agency":
        return "Buat agensi baru dan kelola kreator Anda";
      case "join-invite":
        return "Lengkapi pendaftaran untuk bergabung ke agensi";
      default:
        return "Platform manajemen kreator dan payroll multi-agensi";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{getTitle()}</CardTitle>
          <CardDescription className="text-center">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        
        {isPending && (
          <div className="px-6 pb-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Akun Anda sedang menunggu persetujuan dari admin. Anda akan dapat login setelah akun disetujui.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <CardContent>
          {mode !== "select" && mode !== "join-invite" && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2"
              onClick={() => setMode("select")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          )}

          {mode === "select" && renderModeSelector()}
          {mode === "login" && renderLoginForm()}
          {mode === "create-agency" && renderAgencySignupForm()}
          {mode === "join-invite" && renderInviteSignupForm()}

          {mode === "join-invite" && !inviteLoading && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full"
              onClick={() => {
                navigate("/auth");
                setMode("select");
              }}
            >
              Sudah punya akun? Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}