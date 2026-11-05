ALTER TABLE "concepto" DROP CONSTRAINT "concepto_nombre_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "concepto_nombre_unico" ON "concepto" USING btree (lower("nombre"));--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_nombre_largo" CHECK (char_length("concepto"."nombre") between 1 and 50);--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_nombre_no_otro" CHECK (lower("concepto"."nombre") <> 'otro');