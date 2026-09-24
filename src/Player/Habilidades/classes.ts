import type { DefinicaoClasse } from "../ECA.js";

export const ClassesDoJogo: Record<string, DefinicaoClasse> = {
    "CIDADE_JUSTICEIRO": { alinhamento: "Cidade", nome: "Justiceiro" },
    "CIDADE_INVESTIGACAO": { alinhamento: "Cidade", nome: "Investigação" },
    "CIDADE_PROTECAO": { alinhamento: "Cidade", nome: "Proteção" },
    "CIDADE_SUPORTE": { alinhamento: "Cidade", nome: "Suporte" },
    "MAFIA_LIDER": { alinhamento: "Mafia", nome: "Líder" },
    "MAFIA_ASSASSINO": { alinhamento: "Mafia", nome: "Assassino" },
    "MAFIA_DISRUPCAO": { alinhamento: "Mafia", nome: "Disrupção" },
    "NEUTRO": { alinhamento: "Neutro", nome: "Neutro" }
};