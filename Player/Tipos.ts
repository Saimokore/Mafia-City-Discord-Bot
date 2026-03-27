export type DadoImpedidaEvangelho = {
    tipo: "IMPEDIDA_EVANGELHO";
    habilidadeId: string;
    emissorId: string;
}

export type DadoAlvosRecusados = {
    tipo: "ALVOS_RECUSADOS";
    alvos: string[];
}

export type DadoExtra = DadoImpedidaEvangelho | DadoAlvosRecusados;