ALTER TABLE "usuario" ADD COLUMN "iban" text;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_iban_normalizado" CHECK ("usuario"."iban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$');