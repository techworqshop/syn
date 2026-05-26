-- File-Lock: locked-Flag verhindert Loeschen nach dem ersten Message-Send.
-- Anti-Cheat: User soll nach Start nicht Files austauschen koennen.
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "locked" boolean NOT NULL DEFAULT false;
