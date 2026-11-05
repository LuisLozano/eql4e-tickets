CREATE TYPE "public"."accion_historial" AS ENUM('crear', 'editar', 'anular', 'reenviar', 'autorizar', 'rechazar', 'pagar', 'deshacer_autorizacion', 'deshacer_rechazo', 'deshacer_pago');--> statement-breakpoint
CREATE TYPE "public"."estado_ticket" AS ENUM('pendiente_autorizar', 'rechazado', 'pendiente_pago', 'pagado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."estado_usuario" AS ENUM('invitado', 'activo', 'baja');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('bizum', 'transferencia', 'efectivo', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_codigo" AS ENUM('activacion', 'restablecer');--> statement-breakpoint
CREATE TABLE "codigo_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"codigo_hash" text NOT NULL,
	"tipo" "tipo_codigo" NOT NULL,
	"caduca_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codigo_acceso_codigoHash_unique" UNIQUE("codigo_hash")
);
--> statement-breakpoint
CREATE TABLE "concepto" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "concepto_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "concepto_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "historial" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historial_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"accion" "accion_historial" NOT NULL,
	"estado_origen" "estado_ticket",
	"estado_destino" "estado_ticket" NOT NULL,
	"motivo" text,
	"cambios" jsonb,
	"pago_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"socio_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"metodo" "metodo_pago" NOT NULL,
	"importe_total_centimos" integer NOT NULL,
	"justificante_ruta" text,
	"justificante_mime" text,
	"registrado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_anulacion" text,
	CONSTRAINT "pago_importe_positivo" CHECK ("pago"."importe_total_centimos" > 0),
	CONSTRAINT "pago_anulacion_completa" CHECK (("pago"."anulado_en" is null) = ("pago"."anulado_por" is null) and ("pago"."anulado_en" is null) = ("pago"."motivo_anulacion" is null)),
	CONSTRAINT "pago_justificante_completo" CHECK (("pago"."justificante_ruta" is null) = ("pago"."justificante_mime" is null))
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"caduca_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer GENERATED ALWAYS AS IDENTITY (sequence name "ticket_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"socio_id" uuid NOT NULL,
	"importe_centimos" integer NOT NULL,
	"fecha_compra" date NOT NULL,
	"concepto_id" integer,
	"concepto_otro" text,
	"observaciones" text,
	"estado" "estado_ticket" DEFAULT 'pendiente_autorizar' NOT NULL,
	"motivo_rechazo" text,
	"pago_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_numero_unique" UNIQUE("numero"),
	CONSTRAINT "ticket_importe_positivo" CHECK ("ticket"."importe_centimos" > 0),
	CONSTRAINT "ticket_un_concepto" CHECK (("ticket"."concepto_id" is null) <> ("ticket"."concepto_otro" is null)),
	CONSTRAINT "ticket_concepto_otro_largo" CHECK (char_length("ticket"."concepto_otro") between 1 and 100),
	CONSTRAINT "ticket_observaciones_largo" CHECK (char_length("ticket"."observaciones") <= 500),
	CONSTRAINT "ticket_pagado_con_pago" CHECK (("ticket"."estado" = 'pagado') = ("ticket"."pago_id" is not null)),
	CONSTRAINT "ticket_rechazado_con_motivo" CHECK ("ticket"."estado" <> 'rechazado' or "ticket"."motivo_rechazo" is not null)
);
--> statement-breakpoint
CREATE TABLE "ticket_fichero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"ruta" text NOT NULL,
	"nombre_original" text NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"orden" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"sustituido_en" timestamp with time zone,
	"sustituido_por" uuid,
	CONSTRAINT "ticket_fichero_sustitucion_completa" CHECK (("ticket_fichero"."sustituido_en" is null) = ("ticket_fichero"."sustituido_por" is null))
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"es_socio" boolean DEFAULT true NOT NULL,
	"es_tesorero" boolean DEFAULT false NOT NULL,
	"estado" "estado_usuario" DEFAULT 'invitado' NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_telefono_unique" UNIQUE("telefono"),
	CONSTRAINT "usuario_email_unique" UNIQUE("email"),
	CONSTRAINT "usuario_algun_rol" CHECK ("usuario"."es_socio" or "usuario"."es_tesorero"),
	CONSTRAINT "usuario_email_minusculas" CHECK ("usuario"."email" = lower("usuario"."email")),
	CONSTRAINT "usuario_activo_con_password" CHECK ("usuario"."estado" <> 'activo' or "usuario"."password_hash" is not null)
);
--> statement-breakpoint
ALTER TABLE "codigo_acceso" ADD CONSTRAINT "codigo_acceso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigo_acceso" ADD CONSTRAINT "codigo_acceso_creado_por_usuario_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_pago_id_pago_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_socio_id_usuario_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_anulado_por_usuario_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_socio_id_usuario_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_pago_id_pago_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_fichero" ADD CONSTRAINT "ticket_fichero_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_fichero" ADD CONSTRAINT "ticket_fichero_sustituido_por_usuario_id_fk" FOREIGN KEY ("sustituido_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigo_acceso_usuario_id_index" ON "codigo_acceso" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "historial_ticket_id_index" ON "historial" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "pago_socio_id_index" ON "pago" USING btree ("socio_id");--> statement-breakpoint
CREATE INDEX "sesion_usuario_id_index" ON "sesion" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "ticket_estado_creado_en_index" ON "ticket" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE INDEX "ticket_socio_id_index" ON "ticket" USING btree ("socio_id");--> statement-breakpoint
CREATE INDEX "ticket_fecha_compra_index" ON "ticket" USING btree ("fecha_compra");--> statement-breakpoint
CREATE INDEX "ticket_fichero_ticket_id_index" ON "ticket_fichero" USING btree ("ticket_id");