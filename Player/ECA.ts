
export type TipoGatilho = "AO_USAR" | "AO_MORRER" | "AO_SER_ATACADO" | "AO_AVANCAR_ETAPA" | "AO_OFERTA_ACEITA" | "AO_OFERTA_RECUSADA";

export type Sujeito = "EMISSOR" | "ALVO_SELECIONADO" | "ATACANTE" | "ACAO_ANTERIOR";
export type AtributoSujeito = "ALINHAMENTO" | "CLASSE" | "ESTA_VIVO" | "PROTECAO" | "CARGO" | "FOI_SUCEDIDA";

export type Operador = "IGUAL_A" | "DIFERENTE_DE" | "MAIOR_QUE";

export type TipoAcao = "ATACAR" | "ALTERAR_USO" | "PROTEGER" | "BLOQUEAR" | "CRIAR_OFERTA" | "ADICIONAR_MARCA" | 
"ADICIONAR_PARAMETRO" | "ENVIAR_ALERTA" | "REMOVER_MARCA" | "IMPEDIR_HABILIDADE" | "REMOVER_PARAMETRO";

export interface Condicao {
    sujeito: Sujeito;
    atributo: AtributoSujeito;
    operador: Operador;
    valorEsperado: any; // pode ser string, numero, ou referência a outro sujeito
}

export interface Efeito {
    acao: TipoAcao;
    alvo: Sujeito;
    parametros?: any; // ex: { poderAtaque: 2 }
    condicoes?: Condicao[]; // sem condição sempre executa
}

export interface Gatilho {
    evento: TipoGatilho;
    efeitos: Efeito[];
}

export interface Input {
    idVariavel: string,
    tipoInput: string, // SELECIONAR_JOGADOR, SELECIONAR_CLASSE, SELECIONAR_CARGO, NUMERO, TEXTO, ...
    texto: string
}

export interface DefinicaoHabilidade {
    nome: string;
    tipo: string;
    etapa: string;
    usosMaximos: number;
    modificadores: string[];
    inputs: Input[];
    gatilhos: Gatilho[];
}