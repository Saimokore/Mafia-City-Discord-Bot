
export enum Alinhamento {
    Cidade = "Cidade",
    Mafia   = "Mafia",
    Neutro  = "Neutro"
}

export enum TipoSujeito {
    Emissor = "EMISSOR",
    Alvo    = "ALVO",
    AcaoAnterior = "ACAO_ANTERIOR",
    TodosJogadores = "TODOS_JOGADORES",
    Input = "INPUT"
}

export enum TipoGatilho {
    AoAvancarEtapa    = "AO_AVANCAR_ETAPA",
    AoUsar            = "AO_USAR",
    AoMorrer          = "AO_MORRER",
    AoSerAtacado      = "AO_SER_ATACADO",
    AoOfertaAceita    = "AO_OFERTA_ACEITA",
    AoOfertaRecusada  = "AO_OFERTA_RECUSADA",
    AoResolverInput   = "AO_RESOLVER_INPUT",
}

export enum TipoInput {
    SelecionarPropriaHabilidade = "SELECIONAR_PROPRIA_HABILIDADE",
    SelecionarJogador = "SELECIONAR_JOGADOR",
    SelecionarClasse  = "SELECIONAR_CLASSE",
    SelecionarCargo   = "SELECIONAR_CARGO",
    Numero            = "NUMERO",
    Texto             = "TEXTO",
}
 
export enum TipoAcao {
    CriarOferta                 = "CRIAR_OFERTA",
    Atacar                      = "ATACAR",
    AlterarUso                  = "ALTERAR_USO",
    Proteger                    = "PROTEGER",
    Bloquear                    = "BLOQUEAR",
    AdicionarMarca              = "ADICIONAR_MARCA",
    AdicionarParametro          = "ADICIONAR_PARAMETRO",
    EnviarAlerta                = "ENVIAR_ALERTA",
    RemoverMarca                = "REMOVER_MARCA",
    ImpedirHabilidade           = "IMPEDIR_HABILIDADE",
    RestaurarHabilidadeImpedida = "RESTAURAR_HABILIDADE_IMPEDIDA",
    RemoverParametro            = "REMOVER_PARAMETRO",
    CriarInput                  = "CRIAR_INPUT",
    AtualizarOferta             = "ATUALIZAR_OFERTA",
}

export enum TipoAtributo {
    Alinhamento = "ALINHAMENTO",
    EstaVivo    = "ESTA_VIVO",
    Protecao    = "PROTECAO",
    Classe      = "CLASSE",
    Cargo       = "CARGO",
    FoiSucedida = "FOI_SUCEDIDA",
    CustomId          = "CUSTOM_ID",
}
 
export enum TipoOperador {
    IgualA     = "IGUAL_A",
    DiferenteDe = "DIFERENTE_DE",
    MaiorQue   = "MAIOR_QUE",
}

export interface Condicao {
    sujeito: TipoSujeito;
    atributo: TipoAtributo;
    operador: TipoOperador;
    valorEsperado: Alinhamento | string | number | boolean; // pode ser string, numero, ou referência a outro sujeito
}

export interface Efeito {
    acao: TipoAcao;
    alvo: TipoSujeito;
    parametros?: any; // ex: { poderAtaque: 2 }
    condicoes?: Condicao[]; // sem condição sempre executa
}

export interface Gatilho {
    evento: TipoGatilho;
    efeitos: Efeito[];
}

export interface Input {
    idVariavel: string,
    tipoInput: TipoInput, // SELECIONAR_JOGADOR, SELECIONAR_CLASSE, SELECIONAR_CARGO, NUMERO, TEXTO, ...
    texto: string
}

export interface DefinicaoHabilidade {
    nome: string;
    tipo: string;
    etapa: string;
    usosMaximos: number;
    permiteAutoUso?: boolean;
    modificadores: string[];
    inputs: Input[];
    gatilhos: Gatilho[];
}

export interface DefinicaoCargo {
    nome: string;
    classe: string;
    raridade: string;
    habilidadesIniciais: string[];
    complexidade: number;
    protecaoInata: number;
    gatilhos?: Gatilho[];
}

export interface DefinicaoClasse {
    nome: string;
    alinhamento: "Cidade" | "Mafia" | "Neutro";
    gatilhos?: Gatilho[];
}