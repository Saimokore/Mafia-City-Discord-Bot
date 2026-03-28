import type { DefinicaoClasse } from "../ECA.js";

export const ClassesDoJogo: Record<string, DefinicaoClasse> = {
    "CIDADE_JUSTICEIRO": { alinhamento: "CIDADE", nome: "JUSTICEIRO" },
    "CIDADE_INVESTIGACAO": { alinhamento: "CIDADE", nome: "INVESTIGACAO" },
    "CIDADE_PROTECAO": { alinhamento: "CIDADE", nome: "PROTECAO" },
    "CIDADE_SUPORTE": { alinhamento: "CIDADE", nome: "SUPORTE" },
    "MAFIA_LIDER": { alinhamento: "MAFIA", nome: "LIDER" },
    "MAFIA_ASSASSINO": { alinhamento: "MAFIA", nome: "ASSASSINO" },
    "MAFIA_DISRUPCAO": { alinhamento: "MAFIA", nome: "DISRUPCAO" },
    "NEUTRO": { alinhamento: "NEUTRO", nome: "NEUTRO" }
};