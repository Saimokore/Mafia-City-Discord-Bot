import { prisma } from "../prisma/prisma.js";

export const ActionDAO = {
    async criarGatilho(
        partidaId: string,
        donoId: string,
        etapa: number,
        tipo: string,
        prioridade: number = 0,
        payload: any = {},
        habilidadeId?: string,
        origemEventoId?: string
    ) {
        try {
            return await prisma.action.create({
                data: {
                    partidaId,
                    donoId,
                    etapa,
                    tipo,
                    prioridade,
                    payload: JSON.stringify(payload),
                    habilidadeId: habilidadeId || null,
                    origemEventoId: origemEventoId || null
                }
            });
        } catch (error) {
            console.error(`[ActionDAO] Erro ao criar action ${tipo}:`, error);
            return null;
        }
    },

    async getGatilhosPendentes(partidaId: string, etapa: number) {
        try {
            return await prisma.action.findMany({
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
            console.error(`[ActionDAO] Erro ao buscar actions pendentes na etapa ${etapa}:`, error);
            return null;
        }
    },

    async marcarComoProcessado(id: string) {
        try {
            return await prisma.action.update({
                where: { id },
                data: { status: "PROCESSADO" }
            });
        } catch (error) {
            console.error(`[ActionDAO] Erro ao marcar action ${id} como processado:`, error);
            return null;
        }
    }
}