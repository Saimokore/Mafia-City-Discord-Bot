import { prisma } from "../prisma/prisma.js";

export const GatilhoAtivoDAO = {
    async criarGatilho(
        partidaId: string,
        donoId: string,
        etapa: number,
        tipoGatilho: string,
        prioridade: number = 0,
        payload: any = {},
        habilidadeId?: string,
        origemEventoId?: string
    ) {
        try {
            return await prisma.gatilhoAtivo.create({
                data: {
                    partidaId,
                    donoId,
                    etapa,
                    tipoGatilho,
                    prioridade,
                    payload: JSON.stringify(payload),
                    habilidadeId: habilidadeId || null,
                    origemEventoId: origemEventoId || null
                }
            });
        } catch (error) {
            console.error(`[GatilhoAtivoDAO] Erro ao criar gatilho ${tipoGatilho}:`, error);
            return null;
        }
    },

    async getGatilhosPendentes(partidaId: string, etapa: number) {
        try {
            return await prisma.gatilhoAtivo.findMany({
                where: {
                    partidaId,
                    etapa,
                    status: "ATIVO"
                },
                orderBy: {
                    prioridade: 'desc' // da sort na prioridade
                },
                include: {
                    habilidade: true
                }
            });
        } catch (error) {
            console.error(`[GatilhoAtivoDAO] Erro ao buscar gatilhos pendentes na etapa ${etapa}:`, error);
            return null;
        }
    },

    async marcarComoProcessado(id: string) {
        try {
            return await prisma.gatilhoAtivo.update({
                where: { id },
                data: { status: "PROCESSADO" }
            });
        } catch (error) {
            console.error(`[GatilhoAtivoDAO] Erro ao marcar gatilho ${id} como processado:`, error);
            return null;
        }
    }
}