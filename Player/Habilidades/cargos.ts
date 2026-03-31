import type { DefinicaoCargo } from "../ECA.js";
import { regraEvangelho, regraSnipe } from "./habilidades.js";

export const CargosDoJogo: Record<string, DefinicaoCargo> = {
    "EVANGELISTA": {
        nome: "Evangelista",
        classe: "CIDADE_JUSTICEIRO", // Tem que ser exatamente a chave do ClassesDoJogo
        raridade: "COMUM",
        habilidadesIniciais: ["Evangelho"],
        complexidade: 1,
        protecaoInata: 1
    },
    "ATIRADOR_DE_ELITE": {
        nome: "Atirador de Elite",
        classe: "CIDADE_JUSTICEIRO",
        raridade: "COMUM",
        habilidadesIniciais: ["Snipe"],
        complexidade: 2,
        protecaoInata: 0
    },
    // "Xerife": { ... },
    // "Bigode": { ... }
};