import type { NivelProtecao, PoderAtaque } from "./Habilidades/HabilidadeDinamica.js";

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
    Input = "INPUT",
    AlinhamentoInimigo = "ALINHAMENTO_INIMIGO",
    AlinhamentoAliado = "ALINHAMENTO_ALIADO"
}

export enum TipoGatilho {
    AoAvancarEtapa    = "AO_AVANCAR_ETAPA",
    AoUsar            = "AO_USAR",
    AoMorrer          = "AO_MORRER",
    AoSerAtacado      = "AO_SER_ATACADO",
    AoOfertaAceita    = "AO_OFERTA_ACEITA",
    AoOfertaRecusada  = "AO_OFERTA_RECUSADA",
    AoResolverInput   = "AO_RESOLVER_INPUT",
    AoSerVisitado         = "AO_SER_VISITADO",
    AoMarcadoSerVisitado  = "AO_MARCADO_SER_VISITADO" // quando um jogador marcado por voce for visitado
    // ao ganhar
    // ao ser enforcado
}

export enum TipoInput {
    SelecionarPropriaHabilidade = "SELECIONAR_PROPRIA_HABILIDADE",
    SelecionarJogador           = "SELECIONAR_JOGADOR",
    SelecionarJogadores         = "SELECIONAR_JOGADORES",
    SelecionarClasse            = "SELECIONAR_CLASSE",
    SelecionarCargo             = "SELECIONAR_CARGO",
    Numero                      = "NUMERO",
    Texto                       = "TEXTO",
}
 
export enum TipoAcao {
    // Ação Dummy
    Nenhuma                     = "NENHUMA", // retorna true sempre, serve pra por condições

    // Ações fisicas
    Atacar                      = "ATACAR",
    Proteger                    = "PROTEGER",
    Bloquear                    = "BLOQUEAR",
    
    // Alterar dados
    AlterarUso                  = "ALTERAR_USO",
    AlterarProtInata            = "ALTERAR_PROT_INATA",

    // Criar/Enviar algo
    CriarOferta                 = "CRIAR_OFERTA",
    CriarAlerta                 = "CRIAR_ALERTA",
    CriarInput                  = "CRIAR_INPUT",
    EnviarAnuncio               = "ENVIAR_ANUNCIO",
    EnviarHabilidade            = "ENVIAR_HABILIDADE",
    EnviarItem                  = "ENVIAR_ITEM",
    
    // Adicionar, remover, atualizar
    AtualizarOferta             = "ATUALIZAR_OFERTA",
    AdicionarStatus             = "ADICIONAR_STATUS",
    RemoverStatus               = "REMOVER_STATUSs",
    AdicionarMarca              = "ADICIONAR_MARCA", // parametros sao mais pra condicoes posteriores, marcas mostra em jogo
    RemoverMarca                = "REMOVER_MARCA",
    ImpedirHabilidade           = "IMPEDIR_HABILIDADE",
    RestaurarHabilidadeImpedida = "RESTAURAR_HABILIDADE_IMPEDIDA",

    // Descobrir informações
    DescobrirIdentidade         = "DESCOBRIR_IDENTIDADE",
    DescobrirCargo              = "DESCOBRIR_CARGO",
    DescobrirClasse             = "DESCOBRIR_CLASSE",
    DescobrirSetor              = "DESCOBRIR_SETOR",
    DescobrirQuantidade         = "DESCOBRIR_QUANTIDADE", // vai descobrir a quantidade de player que se encaixam em uma certa condição. tipogatilho.todosJogadores obrigatorio
}

export enum TipoAtributo {
    ID          = "ID",
    Alinhamento = "ALINHAMENTO",
    EstaVivo    = "ESTA_VIVO",
    Protecao    = "PROTECAO",
    Classe      = "CLASSE",
    Cargo       = "CARGO",
    FoiSucedida = "FOI_SUCEDIDA",
    CustomId    = "CUSTOM_ID",
    Marcas      = "MARCAS",
    Efeitos     = "EFEITOS",
    QuantVivos  = "QUANT_VIVOS",
    QuantMortos = "QUANT_MORTOS",
    CausaMorte   = "CAUSA_MORTE"
}
 
export enum TipoOperador {
    IgualA     = "IGUAL_A",
    DiferenteDe = "DIFERENTE_DE",
    MaiorQue   = "MAIOR_QUE",
    MenorQue   = "MENOR_QUE",
    Contem      = "CONTEM", // para strings, arrays, etc
    NaoContem   = "NAO_CONTEM"
}

export interface Condicao {
    sujeito: TipoSujeito | string; // poder ser uma referencia a variavel tbm ("VARIAVEL.algumaCoisa")
    atributo: TipoAtributo;
    operador: TipoOperador;
    valorEsperado: Alinhamento | string | number | boolean; // pode ser string, numero, ou referência a outro sujeito
}

export interface Efeito<A extends TipoAcao = TipoAcao> {
    acao: A;
    alvo: TipoSujeito | string; // pode ser uma referencia a variavel tbm ("VARIAVEL.algumaCoisa")
    parametros?: A extends keyof MapaParametrosAcao ? MapaParametrosAcao[A] : undefined;
    condicoes?: Condicao[];
    aoSuceder?: Efeito[];
    aoFalhar?: Efeito[];
}

export interface Gatilho {
    evento: TipoGatilho;
    condicoes?: Condicao[]; // condições para o gatilho ativar
    aoFalhar?: Efeito[];
    efeitos: Efeito[];
}

export interface Input {
    idVariavel: string,
    tipoInput: TipoInput, // SELECIONAR_JOGADOR, SELECIONAR_CLASSE, SELECIONAR_CARGO, NUMERO, TEXTO, ...
    texto: string,
    opcional?: boolean; // se true, o jogador pode escolher não responder. Se false ou undefined, resposta obrigatória
    validacao?: Condicao[]
}

export interface DefinicaoHabilidade {
    nome: string;
    tipo: string;
    etapa: string;
    usosMaximos: number;
    permiteAutoUso?: boolean;
    modificadores: string[];
    inputs?: Input[];
    gatilhos: Gatilho[];
}

export interface DefinicaoCargo {
    nome: string;
    classe: string;
    raridade: string;
    habilidadesIniciais: string[];
    complexidade: number;
    protecaoInata: number;
    condicoesVitoria?: {
        vitoriaContinua: boolean; // se verdade o jogo continua e apenas anuncia que o jogador venceu
        condicoes: Condicao[];
    }
}

export interface DefinicaoClasse {
    nome: string;
    alinhamento: "Cidade" | "Mafia" | "Neutro";
    gatilhos?: Gatilho[];
}

export interface MapaParametrosAcao {
    [TipoAcao.CriarOferta]: {
        nomeOferta: string;
    };
    [TipoAcao.AtualizarOferta]: {
        nomeOferta: string;
        valorOferta: boolean;
    };
    [TipoAcao.Atacar]: {
        poderAtaque?: PoderAtaque;
    };
    [TipoAcao.AlterarUso]: {
        quantidade?: number;
    };
    [TipoAcao.Proteger]: {
        nivelProtecao?: number;
    };
    [TipoAcao.Bloquear]: undefined; // Sem parâmetros
    [TipoAcao.AdicionarStatus]: {
        nome: string;
    };
    [TipoAcao.RemoverStatus]: {
        nome: string;
    };
    [TipoAcao.AdicionarMarca]: {
        nome: string;
    };
    [TipoAcao.RemoverMarca]: {
        nome: string;
    };
    [TipoAcao.CriarAlerta]: {
        texto: string;
    };
    [TipoAcao.EnviarAnuncio]: {
        texto: string;
    };
    [TipoAcao.ImpedirHabilidade]: {
        nomeHabilidade: string;
        salvarDados: string;
    };
    [TipoAcao.RestaurarHabilidadeImpedida]: {
        tipoDadoExtra: string;
    };
    [TipoAcao.CriarInput]: {
        idVariavel: string;
        tipoInput: TipoInput;
        texto: string;
    };
    [TipoAcao.EnviarHabilidade]: {
        nomeHabilidade: string;
    };
    [TipoAcao.EnviarItem]: {
        nomeItem: string;
    };
    [TipoAcao.DescobrirQuantidade]: {
        texto: string;
        condicoes: Condicao[];
    },
    [TipoAcao.DescobrirCargo]: {
        texto: string;
    }
    [TipoAcao.DescobrirClasse]: {
        texto: string;
    }
    [TipoAcao.DescobrirIdentidade]: {
        texto: string;
    }
    [TipoAcao.DescobrirSetor]: {
        texto: string;
    },
    [TipoAcao.AlterarProtInata]: {
        nivel: NivelProtecao;
    }
}