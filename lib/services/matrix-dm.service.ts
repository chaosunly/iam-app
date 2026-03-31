import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError, ConflictError } from "@/lib/errors";

export interface DmEntry {
  id: string;
  initiatorId: string;
  recipientId: string;
  matrixRoomId: string | null;
  matrixUserId: string | null;
}

export async function listDms(initiatorId: string): Promise<DmEntry[]> {
  const dms = await prisma.matrixDirectMessage.findMany({
    where: { initiatorId },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    dms.map(async (dm) => {
      const account = await prisma.matrixAccount.findUnique({
        where: { iamUserId: dm.recipientId },
      });
      return {
        id: dm.id,
        initiatorId: dm.initiatorId,
        recipientId: dm.recipientId,
        matrixRoomId: dm.matrixRoomId,
        matrixUserId: account?.matrixUserId ?? null,
      };
    }),
  );

  return enriched;
}

export async function createDm(
  initiatorId: string,
  recipientId: string,
): Promise<DmEntry> {
  if (!recipientId) throw new BadRequestError("recipientId is required");

  const account = await prisma.matrixAccount.findUnique({
    where: { iamUserId: recipientId },
  });
  if (!account) {
    throw new NotFoundError(`User '${recipientId}' has no Matrix account`);
  }

  const existing = await prisma.matrixDirectMessage.findFirst({
    where: { initiatorId, recipientId },
  });
  if (existing) throw new ConflictError("DM contact already exists");

  const dm = await prisma.matrixDirectMessage.create({
    data: { initiatorId, recipientId },
  });

  return {
    id: dm.id,
    initiatorId: dm.initiatorId,
    recipientId: dm.recipientId,
    matrixRoomId: dm.matrixRoomId,
    matrixUserId: account.matrixUserId,
  };
}

export async function deleteDm(
  id: string,
  initiatorId: string,
): Promise<void> {
  const dm = await prisma.matrixDirectMessage.findUnique({ where: { id } });
  if (!dm || dm.initiatorId !== initiatorId) {
    throw new NotFoundError(`DM '${id}' not found`);
  }
  await prisma.matrixDirectMessage.delete({ where: { id } });
}
