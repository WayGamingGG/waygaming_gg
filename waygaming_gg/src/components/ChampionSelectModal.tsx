import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { type Champion } from "@/lib/ddragon";
import { getChampionImageUrlSync } from "@/lib/ddragon";

interface ChampionSelectModalProps {
  open: boolean;
  onClose: () => void;
  champions: Champion[];
  onSelect: (champion: Champion) => void;
  version: string;
  title: string;
}

export const ChampionSelectModal = ({ open, onClose, champions, onSelect, version, title }: ChampionSelectModalProps) => {
  const [search, setSearch] = useState("");

  const filtered = champions.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (champion: Champion) => {
    onSelect(champion);
    onClose();
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campeão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-6 gap-2 overflow-y-auto pr-2">
          {filtered.map((champion) => (
            <button
              key={champion.id}
              onClick={() => handleSelect(champion)}
              className="relative aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-accent/50 cursor-pointer transition-all hover:scale-105 group"
              title={champion.name}
            >
              <img
                src={getChampionImageUrlSync(champion.image.full.replace('.png', ''), version)}
                alt={champion.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                <span className="text-xs font-semibold text-foreground truncate px-1">
                  {champion.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
