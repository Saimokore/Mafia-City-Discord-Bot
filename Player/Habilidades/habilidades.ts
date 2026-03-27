import type { DefinicaoHabilidade } from "../ECA.js";

export const regraSnipe: DefinicaoHabilidade = {
    nome: "Snipe",
    tipo: "Ofensiva",
    etapa: "Noite",
    usosMaximos: 2,
    modificadores: ["Dormente"],
    
    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: "SELECIONAR_JOGADOR",
            texto: "Quem é o alvo do seu tiro?"
        },
        {
            idVariavel: "palpite_classe",
            tipoInput: "SELECIONAR_CLASSE",
            texto: "Qual a classe do alvo?" // O usuário escolhe ex: "Cidade_Justiceiro"
        }
    ],

    gatilhos: [
        {
            evento: "AO_USAR", // O Motor vai agendar isso para a resolução da Noite
            efeitos: [
                // EFEITO 1: Dano Extra (Se acertar apenas o Alinhamento)
                {
                    acao: "ATACAR",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { poderAtaque: 2 },
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "ALINHAMENTO",
                            operador: "IGUAL_A",
                            // O interpretador pega "Cidade_Justiceiro" e isola a parte "Cidade"
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento" 
                        }
                    ]
                },
                // EFEITO 2: Dano Padrão (Se errar o Alinhamento)
                {
                    acao: "ATACAR",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { poderAtaque: 0 }, // Ou 1, dependendo do seu balanceamento
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "ALINHAMENTO",
                            operador: "DIFERENTE_DE",
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
                        }
                    ]
                },
                // EFEITO 3: Devolve a bala (Se acertou a Classe em cheio E o alvo morreu)
                {
                    acao: "ALTERAR_USO",
                    alvo: "EMISSOR",
                    parametros: { quantidade: 1 }, // Soma +1 aos usos atuais
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "CLASSE",
                            operador: "IGUAL_A",
                            valorEsperado: "VARIAVEL.palpite_classe_nome" // Compara com "Justiceiro"
                        },
                        {
                            sujeito: "ACAO_ANTERIOR", // Lê o ataque feito no Efeito 1 ou 2
                            atributo: "FOI_SUCEDIDA",
                            operador: "IGUAL_A",
                            valorEsperado: true // Só ganha a bala se o alvo realmente morreu
                        }
                    ]
                }
            ]
        }
    ]
};

export const regraEvangelho: DefinicaoHabilidade = {
    nome: "Evangelho",
    tipo: "Comunicacao",
    etapa: "Dia",
    usosMaximos: 10000,
    modificadores: [],
    
    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: "SELECIONAR_JOGADOR",
            texto: "A quem você deseja pregar o Evangelho?"
        }
    ],

    gatilhos: [
        // GATILHO 1: O que acontece na hora que o usuário clica em Usar no Discord
        {
            evento: "AO_AVANCAR_ETAPA",
            efeitos: [
                {
                    acao: "CRIAR_OFERTA",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { 
                        nomeOferta: "Arrependimento",
                        inputsAceitacao: [
                            { idVariavel: "habilidade_sacrificada", tipoInput: "SELECIONAR_PROPRIA_HABILIDADE", texto: "Qual habilidade você sacrifica?" }
                        ]
                    }
                }
            ]
        },

        // GATILHO 2: O que o jogo faz se o Alvo apertar no botão "Recusar"
        {
            evento: "AO_OFERTA_RECUSADA",
            efeitos: [
                {
                    acao: "ADICIONAR_PARAMETRO",
                    alvo: "EMISSOR",
                    parametros: { tipo: "ALVOS_RECUSADOS", salvarId: "ALVO_SELECIONADO" }
                },
                {
                    acao: "ENVIAR_ALERTA",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { texto: "Você recusou a palavra e seus pecados pesam sobre você..." }
                }
            ]
        },

        // GATILHO 3: O que o jogo faz se o Alvo apertar no botão "Aceitar"
        {
            evento: "AO_OFERTA_ACEITA",
            efeitos: [
                {
                    acao: "REMOVER_MARCA",
                    alvo: "EMISSOR",
                    parametros: { tipo: "ALVOS_RECUSADOS", removerId: "ALVO_SELECIONADO" }
                },
                // Efeito se for da CIDADE: Fica bloqueado!
                {
                    acao: "BLOQUEAR",
                    alvo: "ALVO_SELECIONADO",
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "ALINHAMENTO",
                            operador: "IGUAL_A",
                            valorEsperado: "Cidade"
                        }
                    ]
                },
                // Efeitos se NÃO for da Cidade: Perde Habilidade!
                {
                    acao: "IMPEDIR_HABILIDADE",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { duracao: "ATE_EMISSOR_MORRER", salvarEmExtra: "IMPEDIDA_EVANGELHO" },
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "ALINHAMENTO",
                            operador: "DIFERENTE_DE",
                            valorEsperado: "Cidade"
                        }
                    ]
                },
                {
                    acao: "ENVIAR_ALERTA",
                    alvo: "ALVO_SELECIONADO",
                    parametros: { texto: "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer." },
                    condicoes: [
                        {
                            sujeito: "ALVO_SELECIONADO",
                            atributo: "ALINHAMENTO",
                            operador: "DIFERENTE_DE",
                            valorEsperado: "Cidade"
                        }
                    ]
                }
            ]
        }
    ]
};