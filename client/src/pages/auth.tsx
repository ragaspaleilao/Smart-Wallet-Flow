import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { setUserId } from "@/lib/api";
import type { AuthUser } from "@shared/schema";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Erro inesperado");
  }
  return data as T;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"login" | "register">("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);

  const onAuthed = (user: AuthUser) => {
    setUserId(user.id);
    queryClient.setQueryData(["/api/auth/user"], user);
    setLocation("/");
  };

  const loginMut = useMutation({
    mutationFn: () =>
      postJson<AuthUser>("/api/login", { email: loginEmail, password: loginPassword }),
    onSuccess: onAuthed,
    onError: (err: Error) => setLoginError(err.message),
  });

  const registerMut = useMutation({
    mutationFn: () =>
      postJson<AuthUser>("/api/register", {
        email: regEmail,
        password: regPassword,
        name: regName || undefined,
      }),
    onSuccess: onAuthed,
    onError: (err: Error) => setRegError(err.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo-financas-facil.jpg" alt="Finanças Fácil" className="w-12 h-12 rounded-xl object-cover" />
            <span className="text-2xl font-bold text-[#0a2540]">Finanças Fácil</span>
          </div>
          <CardTitle>Bem-vindo</CardTitle>
          <CardDescription>Entre ou crie sua conta para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoginError(null);
                  loginMut.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    data-testid="input-login-password"
                  />
                </div>
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription data-testid="text-login-error">{loginError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-green-500 hover:opacity-90"
                  disabled={loginMut.isPending}
                  data-testid="button-submit-login"
                >
                  {loginMut.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRegError(null);
                  registerMut.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nome</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    data-testid="input-register-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    data-testid="input-register-password"
                  />
                  <p className="text-xs text-gray-500">Mínimo de 6 caracteres.</p>
                </div>
                {regError && (
                  <Alert variant="destructive">
                    <AlertDescription data-testid="text-register-error">{regError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-green-500 hover:opacity-90"
                  disabled={registerMut.isPending}
                  data-testid="button-submit-register"
                >
                  {registerMut.isPending ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
