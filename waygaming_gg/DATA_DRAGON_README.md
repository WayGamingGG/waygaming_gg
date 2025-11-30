# Data Dragon Integration - Documentação Completa

## 📋 Visão Geral

Integração completa com o Data Dragon da Riot Games, incluindo busca automática de versão, cache local, e suporte a múltiplos idiomas.

## ✨ Funcionalidades

- ✅ Busca automática da versão mais recente do LoL
- ✅ Cache local com expiração de 24 horas
- ✅ Atualização automática quando há nova versão
- ✅ Suporte a múltiplos idiomas (pt_BR, en_US, es_ES, etc.)
- ✅ Dados de campeões, itens, runas e feitiços
- ✅ URLs de imagens para todos os recursos
- ✅ TypeScript com tipos completos

## 🚀 Como Usar

### 1. Buscar Versão do LoL

```typescript
import { getLatestVersion } from "@/lib/ddragon";

const version = await getLatestVersion();
console.log(version); // "14.24.1"
```

### 2. Listar Campeões

```typescript
import { getChampionsList } from "@/lib/ddragon";

// Português
const champions = await getChampionsList("pt_BR");

// Inglês
const championsEN = await getChampionsList("en_US");

// Usar cada campeão
champions.forEach(champion => {
  console.log(champion.name); // "Ahri"
  console.log(champion.title); // "a Raposa de Nove Caudas"
  console.log(champion.tags); // ["Mage", "Assassin"]
});
```

### 3. Detalhes de um Campeão

```typescript
import { getChampionDetails } from "@/lib/ddragon";

const ahri = await getChampionDetails("Ahri", "pt_BR");

console.log(ahri?.lore); // História completa
console.log(ahri?.spells); // Array com Q, W, E, R
console.log(ahri?.passive); // Passiva
console.log(ahri?.skins); // Todas as skins
```

### 4. Listar Itens

```typescript
import { getItemsList } from "@/lib/ddragon";

const items = await getItemsList("pt_BR");

// items é um objeto: { "1001": {...}, "1004": {...} }
Object.entries(items).forEach(([id, item]) => {
  console.log(item.name); // "Botas de Velocidade"
  console.log(item.gold.total); // 300
  console.log(item.tags); // ["Boots"]
});
```

### 5. Listar Runas

```typescript
import { getRunesList } from "@/lib/ddragon";

const runes = await getRunesList("pt_BR");

runes.forEach(tree => {
  console.log(tree.name); // "Precisão"
  tree.slots.forEach(slot => {
    slot.runes.forEach(rune => {
      console.log(rune.name); // "Pressionar o Ataque"
      console.log(rune.shortDesc);
    });
  });
});
```

### 6. Listar Feitiços de Invocador

```typescript
import { getSummonerSpellsList } from "@/lib/ddragon";

const spells = await getSummonerSpellsList("pt_BR");

Object.entries(spells).forEach(([key, spell]) => {
  console.log(spell.name); // "Flash"
  console.log(spell.cooldown); // [300]
});
```

### 7. URLs de Imagens

```typescript
import {
  getChampionImageUrl,
  getChampionSplashUrl,
  getItemImageUrl,
  getSpellImageUrl,
  getRuneImageUrl,
} from "@/lib/ddragon";

// Ícone do campeão
const iconUrl = await getChampionImageUrl("Ahri");
// https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Ahri.png

// Splash art
const splashUrl = getChampionSplashUrl("Ahri", 0);
// https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg

// Splash de skin específica
const popStarSplash = getChampionSplashUrl("Ahri", 2);

// Imagem de item
const itemUrl = await getItemImageUrl("1001");
// https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/1001.png

// Imagem de feitiço
const spellUrl = await getSpellImageUrl("SummonerFlash");

// Ícone de runa
const runeUrl = getRuneImageUrl("perk-images/Styles/Precision/PressTheAttack.png");
```

### 8. Limpar Cache

```typescript
import { clearCache } from "@/lib/ddragon";

// Limpa todo o cache do Data Dragon
clearCache();
```

## 🎨 Exemplo de Componente React

```tsx
import { useState, useEffect } from "react";
import { getChampionsList, getChampionImageUrlSync, getLatestVersion } from "@/lib/ddragon";

export const ChampionGrid = () => {
  const [champions, setChampions] = useState([]);
  const [version, setVersion] = useState("");

  useEffect(() => {
    const load = async () => {
      const v = await getLatestVersion();
      setVersion(v);
      const data = await getChampionsList("pt_BR");
      setChampions(data);
    };
    load();
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      {champions.map((champ) => (
        <div key={champ.id}>
          <img 
            src={getChampionImageUrlSync(champ.id, version)} 
            alt={champ.name} 
          />
          <h3>{champ.name}</h3>
          <p>{champ.title}</p>
        </div>
      ))}
    </div>
  );
};
```

## 🌐 Idiomas Suportados

- `pt_BR` - Português (Brasil)
- `en_US` - Inglês (EUA)
- `es_ES` - Espanhol (Espanha)
- `es_MX` - Espanhol (México)
- `fr_FR` - Francês
- `de_DE` - Alemão
- `it_IT` - Italiano
- `pl_PL` - Polonês
- `ru_RU` - Russo
- `tr_TR` - Turco
- `ja_JP` - Japonês
- `ko_KR` - Coreano
- `zh_CN` - Chinês Simplificado

## 💾 Sistema de Cache

O cache funciona automaticamente:

1. **Primeira chamada**: Busca dados da API e guarda no localStorage
2. **Chamadas seguintes**: Retorna do cache instantaneamente
3. **Expiração**: Cache expira após 24 horas
4. **Atualização de versão**: Se houver nova versão do LoL, busca automaticamente

## 📦 Estrutura de Dados

### Champion
```typescript
{
  id: "Ahri",
  key: "103",
  name: "Ahri",
  title: "a Raposa de Nove Caudas",
  blurb: "Descrição curta...",
  info: {
    attack: 3,
    defense: 4,
    magic: 8,
    difficulty: 5
  },
  image: {
    full: "Ahri.png",
    sprite: "champion0.png"
  },
  tags: ["Mage", "Assassin"],
  partype: "Mana",
  stats: { ... }
}
```

### Item
```typescript
{
  name: "Botas de Velocidade",
  description: "HTML description",
  plaintext: "Texto simples",
  gold: {
    base: 300,
    total: 300,
    sell: 210,
    purchasable: true
  },
  tags: ["Boots"],
  stats: { FlatMovementSpeedMod: 25 },
  image: { full: "1001.png" }
}
```

## 🔧 Troubleshooting

### Cache não está funcionando
```typescript
// Verifique se localStorage está disponível
if (typeof localStorage !== 'undefined') {
  console.log("localStorage disponível");
}
```

### Imagens não carregam
```typescript
// Use a versão sync para componentes já renderizados
import { getChampionImageUrlSync } from "@/lib/ddragon";

// Certifique-se de passar a versão
const url = getChampionImageUrlSync("Ahri", version);
```

### Dados desatualizados
```typescript
// Limpe o cache manualmente
import { clearCache } from "@/lib/ddragon";
clearCache();
```

## 🎯 Boas Práticas

1. **Cache a versão**: Busque a versão uma vez e reutilize
2. **Use TypeScript**: Aproveite os tipos para autocompletar
3. **Trate erros**: Sempre use try/catch ou .catch()
4. **Idioma padrão**: Configure `pt_BR` como padrão
5. **Loading states**: Mostre indicadores de carregamento

## 📚 Recursos Adicionais

- [Data Dragon Documentation](https://developer.riotgames.com/docs/lol#data-dragon)
- [Community Dragon](https://www.communitydragon.org/) - Assets extras
- [Riot Developer Portal](https://developer.riotgames.com/)

## 🔄 Atualização Automática

O sistema detecta automaticamente novas versões:

```typescript
// Armazenado no cache: version: "14.24.1"
// Nova versão disponível: "14.25.1"
// Sistema detecta e atualiza automaticamente!
```

## 🚀 Performance

- **Cache Hit**: ~0ms (localStorage)
- **Cache Miss**: ~200-500ms (API + cache)
- **Tamanho do cache**: ~2-5MB total
- **Expiração**: 24 horas

---

✨ **Pronto para usar!** Todos os dados do LoL sem necessidade de API key da Riot.
