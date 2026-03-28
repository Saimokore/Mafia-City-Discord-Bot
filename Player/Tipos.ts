export interface DadoAlvosRecusados {
    tipo: "ALVOS_RECUSADOS";
    alvos: string[];
}

export interface DadoMaldicao {
    tipo: string; // "IMPEDIDA_EVANGELHO"
    habilidadeId: string;
    emissorId: string;
}

export type DadoExtra = DadoAlvosRecusados | DadoMaldicao;