import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Info, Check } from "lucide-react";
import { getLatestVersion, clearCache } from "@/lib/ddragon";
import { useToast } from "@/hooks/use-toast";

export const DataDragonInfo = () => {
  const [version, setVersion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVersion();
  }, []);

  const loadVersion = async () => {
    const currentVersion = await getLatestVersion();
    setVersion(currentVersion);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      clearCache();
      await loadVersion();
      toast({
        title: "Cache atualizado!",
        description: "Dados do Data Dragon foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o cache.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card p-4 border-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Data Dragon</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">Versão do LoL:</p>
              <Badge variant="outline" className="text-xs">
                {version || "Carregando..."}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-accent/30 hover:bg-accent/10"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Atualizar
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
