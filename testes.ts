// import type { Game } from "./Managers/GameManager.js";

// export async function testes(game: Game) {
//     try {
//         console.log("🚀 INICIANDO TESTES...")
//         await testeSnipeDet(game);
//         await testeExecDet(game);
//         await testeCondicoesVitoria(game);
//     } catch (error) {
//         console.error("❌ Ocorreu um erro catastrófico durante os testes:", error);
//         game.setTransicaoEtapa(false);
//         game.setTeste(false);
//     }
// }

// async function testeSnipeDet(game: Game) {
//     // 1. LIGA O MODO DE TRANSIÇÃO (Para não tentar salvar no banco)
//     game.setTransicaoEtapa(true);
//     game.setTeste(true);

//     // 2. CRIANDO OS JOGADORES FANTASMAS (MOCK DO PRISMA)
//     const mockSniper: any = {
//         id: "uuid-sniper", userId: "discord-sniper", username: "Sniper (Cidade)", estaVivo: true, protecao: 0,
//         cargo: "Atirador_de_elite", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: [{ id: "hab-snipe", nome: "Snipe", uso: 2, status: "DISPONIVEL" }]
//     };

//     const mockMafioso: any = {
//         id: "uuid-mafioso", userId: "discord-mafioso", username: "Chefe (Máfia)", estaVivo: true, protecao: 1,
//         cargo: "Mafia_lider", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: [{ id: "hab-massacre", nome: "Massacre", uso: 1, status: "DISPONIVEL" }]
//     };

//     const mockEvangelista: any = {
//         id: "uuid-evangelista", userId: "discord-evangelista", username: "Padre (Cidade)", estaVivo: true, protecao: 0,
//         cargo: "Evangelista", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: [{ id: "hab-evangelho", nome: "Evangelho", uso: 10, status: "DISPONIVEL" }]
//     };

//     // 3. INJETANDO NO CACHE
//     const sniper = await game.getPlayerManager().loadPlayer(mockSniper);
//     const mafioso = await game.getPlayerManager().loadPlayer(mockMafioso);
//     const evangelista = await game.getPlayerManager().loadPlayer(mockEvangelista);
    
//     // Hackeando a RAM do PlayerManager
//     (game.getPlayerManager() as any).playersCache = [sniper, mafioso, evangelista];

//     console.log("\n🟢 --- TESTE 1: SNIPE ---");
//     const habSnipe = sniper!.getHabilidade("Snipe")!;
    
//     // Criando uma Ação Falsa simulando o Modal (Acertando a Classe em cheio)
//     const fakeActionSnipe = new Action({
//         id: "act-1", userId: "uuid-sniper", habilidadeId: "hab-snipe", tipo: "Ofensiva", sucesso: "PENDENTE", etapa: 1,
//         alvos: [{ alvoId: "uuid-mafioso" }],
//         parametrosAcao: JSON.stringify({
//             palpite_classe_alinhamento: "Mafia", 
//             palpite_classe_nome: "Lider" // Note que no banco você botou "Mafia_Lider"
//         })
//     } as any);

//     await habSnipe.ativar(game, fakeActionSnipe, "AO_AVANCAR_ETAPA");

//     console.log(`💀 Mafioso morreu? ${!mafioso!.estaVivo() ? "✅ SIM" : "❌ NÃO"}`);
//     console.log(`🔫 Balas devolvidas? (Usos do Snipe): ${habSnipe.getUso() === 2 ? "✅ SIM (2)" : `❌ NÃO (${habSnipe.getUso()})`}`);
    
    
//     console.log("\n🟢 --- TESTE 2: EVANGELHO (A MÁQUINA DE ESTADOS) ---");
//     // Ressuscitando o mafioso para o próximo teste
//     mafioso!.setEstaVivo(true);
//     const habEvangelho = evangelista!.getHabilidade("Evangelho")!;

//     // PASSO A: Mafioso aceita a oferta. (A engine deve bloquear e pedir input)
//     console.log("👉 2A. O Mafioso (que não é da Cidade) aceita o Evangelho...");
//     const fakeActionAceitar = new Action({
//         id: "act-2", userId: "uuid-evangelista", habilidadeId: "hab-evangelho", tipo: "Comunicacao", sucesso: "PENDENTE", etapa: 1,
//         alvos: [{ alvoId: "uuid-mafioso" }], parametrosAcao: "{}"
//     } as any);

//     await habEvangelho.ativar(game, fakeActionAceitar, "AO_OFERTA_ACEITA");
//     // Testaremos se o CriarInput e EnviarAlerta não crasharam no console.

//     // PASSO B: Mafioso resolve o input (Escolhe sacrificar o Massacre)
//     console.log("👉 2B. O Mafioso escolhe sacrificar a habilidade 'Massacre'...");
//     const fakeActionInput = new Action({
//         id: "act-3", userId: "uuid-evangelista", habilidadeId: "hab-evangelho", tipo: "Comunicacao", sucesso: "PENDENTE", etapa: 1,
//         alvos: [{ alvoId: "uuid-mafioso" }],
//         // Aqui nós simulamos as "variaveisColetadas" geradas pelo HabilidadeDinamica.resolverInput()
//         parametrosAcao: JSON.stringify({
//             customId: "habilidade_sacrificada",
//             habilidade_sacrificada: "Massacre"
//         })
//     } as any);

//     await habEvangelho.ativar(game, fakeActionInput, "AO_RESOLVER_INPUT");
    
//     const habMassacre = mafioso!.getHabilidade("Massacre")!;
//     console.log(`🚫 Massacre foi impedido? ${habMassacre.getStatus() === "IMPEDIDA" ? "✅ SIM" : "❌ NÃO"}`);
//     console.log(`📝 Dado Extra salvo no Mafioso? ${mafioso!.getDadosExtra().length > 0 ? "✅ SIM" : "❌ NÃO"}`);


//     // PASSO C: A Morte do Evangelista
//     console.log("👉 2C. O Evangelista morre. O gatilho global deve disparar...");
    
//     // O gatilho AO_MORRER não tem action e usa o TODOS_JOGADORES, então passamos a action nula e o emissorOpcional
//     await habEvangelho.ativar(game, null, "AO_MORRER", evangelista!);

//     console.log(`✨ Massacre foi restaurado? ${habMassacre.getStatus() === "DISPONIVEL" ? "✅ SIM" : "❌ NÃO"}`);
//     console.log(`🧹 Dado Extra limpo do Mafioso? ${mafioso!.getDadosExtra().length === 0 ? "✅ SIM" : "❌ NÃO"}`);


//     // 4. LIMPANDO O CACHE
//     game.setTransicaoEtapa(false);
//     game.setTeste(false);
//     game.getPlayerManager().limparCache();

//     console.log("\n✅ BATERIA DE TESTES CONCLUÍDA!");
// }

// async function testeExecDet(game: Game) {
//     game.setTransicaoEtapa(true);

//     // 1. CRIANDO OS JOGADORES (MOCK)
//     const mockSniper: any = {
//         id: "uuid-sniper", userId: "discord-sniper", username: "Sniper (Cidade)", estaVivo: true, protecao: 0,
//         cargo: "ATIRADOR_DE_ELITE", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: [{ id: "hab-exec", nome: "Execução Pública", uso: 1, status: "DISPONIVEL" }]
//     };

//     const mockDetetive: any = {
//         id: "uuid-detetive", userId: "discord-detetive", username: "Sherlock (Cidade)", estaVivo: true, protecao: 0,
//         cargo: "DETETIVE", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: [
//             { id: "hab-proc", nome: "Processo de Eliminação", uso: 10, status: "DISPONIVEL" },
//             { id: "hab-inv", nome: "Investigação Profunda", uso: 1, status: "DISPONIVEL" }
//         ]
//     };

//     const mockMafioso: any = {
//         id: "uuid-mafioso", userId: "discord-mafioso", username: "Chefe (Máfia)", estaVivo: true, protecao: 0,
//         cargo: "MAFIA_LIDER", status: "[]", marcas: "[]", dadosExtra: "[]",
//         habilidades: []
//     };

//     const sniper = await game.getPlayerManager().loadPlayer(mockSniper);
//     const detetive = await game.getPlayerManager().loadPlayer(mockDetetive);
//     const mafioso = await game.getPlayerManager().loadPlayer(mockMafioso);
    
//     (game.getPlayerManager() as any).playersCache = [sniper, detetive, mafioso];

//     // ==========================================================
//     console.log("\n🟢 --- TESTE 1: EXECUÇÃO PÚBLICA (O ERRO FATAL) ---");
//     const habExecucao = sniper!.getHabilidade("Execução Pública")!;
    
//     // O Sniper tenta executar o Mafioso, mas erra a classe feio (Acha que é da Cidade)
//     const actionErroFatal = new Action({
//         id: "act-exec-1", userId: "uuid-sniper", habilidadeId: "hab-exec", tipo: "Instantanea", sucesso: "PENDENTE", etapa: 1,
//         alvos: [{ alvoId: "uuid-mafioso" }],
//         parametrosAcao: JSON.stringify({
//             adivinhar_classe_alinhamento: "Cidade", 
//             adivinhar_classe_nome: "Justiceiro" 
//         })
//     } as any);

//     await habExecucao.ativar(game, actionErroFatal, "AO_USAR");

//     console.log(`💀 Mafioso morreu? ${!mafioso!.estaVivo() ? "✅ SIM (Tomou Dano Poderoso)" : "❌ NÃO"}`);
//     console.log(`💀 Sniper se matou por errar? ${!sniper!.estaVivo() ? "✅ SIM (Tomou Obliteração!)" : "❌ NÃO"}`);

//     // ==========================================================
//     console.log("\n🟢 --- TESTE 2: O COMBO DO DETETIVE ---");
//     // Ressuscitando o mafioso para o teste 2
//     mafioso!.setEstaVivo(true);
//     const habProcesso = detetive!.getHabilidade("Processo de Eliminação")!;
//     const habInvestigacao = detetive!.getHabilidade("Investigação Profunda")!;

//     console.log("👉 2A. Detetive usa Processo de Eliminação no Mafioso (Noite)...");
//     const actionProcesso = new Action({
//         id: "act-det-1", userId: "uuid-detetive", habilidadeId: "hab-proc", tipo: "Investigação", sucesso: "PENDENTE", etapa: 1,
//         alvos: [{ alvoId: "uuid-mafioso" }], parametrosAcao: "{}"
//     } as any);

//     await habProcesso.ativar(game, actionProcesso, "AO_AVANCAR_ETAPA");
//     console.log(`🔎 Mafioso ganhou a marca 'Suspeito'? ${mafioso!.getMarcas().includes("Suspeito") ? "✅ SIM" : "❌ NÃO"}`);


//     console.log("👉 2B. Detetive usa Investigação Profunda no Mafioso (Dia)...");
//     const actionInvestigar = new Action({
//         id: "act-det-2", userId: "uuid-detetive", habilidadeId: "hab-inv", tipo: "Investigação", sucesso: "PENDENTE", etapa: 2,
//         alvos: [{ alvoId: "uuid-mafioso" }],
//         parametrosAcao: JSON.stringify({ cargo_alvo: "Chefe" })
//     } as any);

//     // A própria HabilidadeDinamica deve avaliar a validação do Input antes de ativar!
//     // (Assumindo que você implementou a validação de inputs que exige a marca Suspeito)
//     await habInvestigacao.ativar(game, actionInvestigar, "AO_AVANCAR_ETAPA");
//     console.log("✅ Se não houve erros no console e a ação rodou, a validação 'Contem Suspeito' funcionou perfeitamente!");


//     // LIMPEZA
//     game.setTransicaoEtapa(false);
//     game.getPlayerManager().limparCache();
//     console.log("\n✅ BATERIA DE TESTES 2 CONCLUÍDA!");
// }

// async function testeCondicoesVitoria(game: Game) {
//     console.log("\n🟢 --- TESTE 3: CONDIÇÕES DE VITÓRIA (CIDADE x MÁFIA x NEUTROS) ---");
//     game.setTransicaoEtapa(true);
//     game.setTeste(true);

//     // 1. CRIANDO OS JOGADORES
//     const mockCidade: any = { id: "cid-1", userId: "discord-cid", username: "Cidadão de Bem", estaVivo: true, cargo: "EVANGELISTA", status: "[]", marcas: "[]", dadosExtra: "[]", habilidades: [] };
//     const mockMafia: any  = { id: "maf-1", userId: "discord-maf", username: "Poderoso Chefão", estaVivo: true, cargo: "MAFIA_LIDER", status: "[]", marcas: "[]", dadosExtra: "[]", habilidades: [] };
//     const mockSK: any     = { id: "sk-1", userId: "discord-sk", username: "Serial Killer", estaVivo: true, cargo: "SERIAL_KILLER", status: "[]", marcas: "[]", dadosExtra: "[]", habilidades: [] };

//     const cidadao = await game.getPlayerManager().loadPlayer(mockCidade);
//     const mafioso = await game.getPlayerManager().loadPlayer(mockMafia);
//     const sk      = await game.getPlayerManager().loadPlayer(mockSK);

//     // 2. HACKEANDO A RAM PARA ISOLAR O TESTE
//     // (Forçamos o alinhamento e as regras do SK para não depender do banco de dados)
//     cidadao!.getAlinhamento = () => "Cidade";
//     mafioso!.getAlinhamento = () => "Mafia";
//     sk!.getAlinhamento      = () => "Neutro";

//     sk!.getCargo = () => ({
//         getNome: () => "Serial Killer",
//         // A regra de Ouro: Só ganha se sobrar apenas ele vivo
//         getCondicoesVitoria: () => [
//             { sujeito: "TODOS_JOGADORES", atributo: "QUANT_VIVOS", operador: "IGUAL_A", valorEsperado: 1 },
//             { sujeito: "EMISSOR", atributo: "ESTA_VIVO", operador: "IGUAL_A", valorEsperado: true }
//         ]
//     } as any);

//     (game.getPlayerManager() as any).playersCache = [cidadao, mafioso, sk];

//     // 3. INTERCEPTANDO MÉTODOS REAIS PARA NÃO ENCERRAR O BOT
//     const sendAnuncioOriginal = game.sendAnuncio.bind(game);
//     const terminarJogoOriginal = game.terminarJogo.bind(game);
//     let ultimoAnuncio = "";
    
//     // Fingimos enviar no Discord e guardamos a mensagem para conferir
//     game.sendAnuncio = async (msg: string) => { ultimoAnuncio = msg; console.log(`\n📢 [DISCORD MOCK]: ${msg}`); };
//     // Impede que o bot apague a partida real durante o teste
//     game.terminarJogo = async () => {}; 

//     // ==========================================================
//     console.log("\n👉 3A. Jogo rolando (1 Cidade, 1 Máfia, 1 SK)... Ninguém deve ganhar.");
//     let ganhou = await game.verificarVitoria();
//     console.log(`✅ O jogo continuou? ${!ganhou ? "SIM" : "NÃO"}`);

//     // ==========================================================
//     console.log("\n👉 3B. A Máfia atira e mata a Cidade e o SK à noite.");
//     cidadao!.setEstaVivo(false);
//     sk!.setEstaVivo(false);
    
//     ganhou = await game.verificarVitoria();
//     console.log(`✅ Alguém ganhou? ${ganhou ? "SIM" : "NÃO"}`);
//     console.log(`✅ Foi a Máfia? ${ultimoAnuncio.includes("A Máfia subjugou") ? "SIM" : "NÃO"}`);

//     // ==========================================================
//     console.log("\n👉 3C. A Cidade vota e enforca o Mafioso de dia.");
//     // (Reset do cenário)
//     cidadao!.setEstaVivo(true); 
//     sk!.setEstaVivo(false);
//     mafioso!.setEstaVivo(false);

//     ganhou = await game.verificarVitoria();
//     console.log(`✅ Alguém ganhou? ${ganhou ? "SIM" : "NÃO"}`);
//     console.log(`✅ Foi a Cidade? ${ultimoAnuncio.includes("A Cidade eliminou") ? "SIM" : "NÃO"}`);

//     // ==========================================================
//     console.log("\n👉 3D. O Serial Killer faz um banho de sangue e mata todos.");
//     // (Reset do cenário)
//     cidadao!.setEstaVivo(false);
//     mafioso!.setEstaVivo(false);
//     sk!.setEstaVivo(true);

//     ganhou = await game.verificarVitoria();
//     console.log(`✅ Alguém ganhou? ${ganhou ? "SIM" : "NÃO"}`);
//     console.log(`✅ A Engine leu o ECA Dinâmico do SK? ${ultimoAnuncio.includes("Serial Killer") ? "SIM" : "NÃO"}`);


//     // ==========================================================
//     // LIMPEZA DA BAGUNÇA
//     game.sendAnuncio = sendAnuncioOriginal;
//     game.terminarJogo = terminarJogoOriginal;
//     game.setTransicaoEtapa(false);
//     game.getPlayerManager().limparCache();
//     console.log("\n✅ BATERIA DE TESTES 3 CONCLUÍDA!");
// }