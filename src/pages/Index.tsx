import { useEffect, useState } from "react";
import { getLatestVersion } from "@/lib/ddragon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [version, setVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const latestVersion = await getLatestVersion();
        setVersion(latestVersion);
      } catch (error) {
        console.error("Erro ao carregar versão:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVersion();
  }, []);

  const patchNumber = version.split(".").slice(0, 2).join(".");
  const patchUrl = `https://www.leagueoflegends.com/en-us/news/game-updates/patch-${patchNumber.replace(".", "-")}-notes/`;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="mb-2 text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Way Gaming
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Central de análise e estratégia para League of Legends
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Notas do Patch Atual
              </CardTitle>
              <CardDescription>
                Confira as últimas mudanças, buffs e nerfs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Versão atual:</span>
                    <span className="text-lg font-bold text-primary">{patchNumber}</span>
                  </div>
                  <Button asChild className="w-full">
                    <a href={patchUrl} target="_blank" rel="noopener noreferrer">
                      Ver Notas do Patch
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Recursos Disponíveis
              </CardTitle>
              <CardDescription>
                Ferramentas para análise de campeões e draft
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Análise de matchups com IA
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Builds e runas otimizadas
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Simulador de Pick & Ban
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Área do Coach com análises
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
