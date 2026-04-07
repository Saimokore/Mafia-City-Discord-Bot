import type { DefinicaoCargo } from "../ECA.js";
import { regraEvangelho, regraSnipe } from "./habilidades.js";

export const CargosDoJogo: Record<string, DefinicaoCargo> = {
    "EVANGELISTA": {
        nome: "Evangelista",
        classe: "CIDADE_JUSTICEIRO", // Tem que ser exatamente a chave do ClassesDoJogo
        raridade: "COMUM",
        habilidadesIniciais: ["EVANGELHO"],
        complexidade: 1,
        protecaoInata: 1
    },
    "ATIRADOR_DE_ELITE": {
        nome: "Atirador de Elite",
        classe: "CIDADE_JUSTICEIRO",
        raridade: "COMUM",
        habilidadesIniciais: ["SNIPE", "EXECUCAO_PUBLICA"],
        complexidade: 2,
        protecaoInata: 0
    },
    "DETETIVE": {
        nome: "Detetive",
        classe: "CIDADE_INVESTIGACAO",
        raridade: "COMUM",
        habilidadesIniciais: ["PROCESSO_DE_ELIMINACAO", "INVESTIGACAO_PROFUNDA"],
        complexidade: 1,
        protecaoInata: 0
    },
    "MAFIA_LIDER": {
        nome: "Chefe",
        classe: "MAFIA_LIDER",
        raridade: "COMUM",
        habilidadesIniciais: ["MASSACRE"],
        complexidade: 2,
        protecaoInata: 0
    }
    // "Xerife": { ... },
    // "Bigode": { ... }
};

// "SERIAL_KILLER": {
//     // ... dados do cargo ...
//     condicoesVitoria: [
//         {
//             sujeito: TipoSujeito.TodosJogadores, // Olha para o jogo inteiro
//             atributo: TipoAtributo.QuantidadeVivos,
//             operador: TipoOperador.IgualA,
//             valorEsperado: 1 // Só ganha se houver apenas 1 pessoa viva (ele mesmo)
//         },
//         {
//             sujeito: TipoSujeito.Emissor, 
//             atributo: TipoAtributo.EstaVivo,
//             operador: TipoOperador.IgualA,
//             valorEsperado: true // Ele tem que ser esse 1 sobrevivente!
//         }
//     ]
// }